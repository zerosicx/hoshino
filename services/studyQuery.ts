/**
 * SQL and row mapping for the study system.
 *
 * Free of any database import so every query can be run against a plain SQLite
 * file in tests; `services/srs.ts` and `services/stats.ts` execute them.
 *
 * Two rules shape the queries. A word in a list is "new" by having no row in
 * `srs_cards` — the row is created on the first rating, so joining a list has
 * no side effects. And every card query joins `list_items`, so a card whose
 * word has left its list is simply invisible rather than deleted, and its
 * progress comes back if the word is re-added.
 */

import { State, type Card } from "ts-fsrs";
import { MASTERED_STABILITY } from "./scheduler";
import type { DailyStats, ListProgress, StudyCard } from "@/types/study";

// ---------------------------------------------------------------------------
// Cards

export interface CardRow {
  entry_id: number;
  list_id: number;
  due: string | null;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
  suspended: number;
}

export function toStudyCard(row: CardRow): StudyCard {
  return {
    entryId: row.entry_id,
    listId: row.list_id,
    suspended: row.suspended === 1,
    card: {
      due: new Date(row.due ?? 0),
      stability: row.stability,
      difficulty: row.difficulty,
      elapsed_days: row.elapsed_days,
      scheduled_days: row.scheduled_days,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state as State,
      last_review: row.last_review ? new Date(row.last_review) : undefined,
    },
  };
}

/** The bind values for `UPSERT_CARD_SQL`, in order. */
export function cardParams(entryId: number, listId: number, card: Card) {
  return [
    entryId,
    listId,
    card.due.toISOString(),
    card.stability,
    card.difficulty,
    card.elapsed_days,
    card.scheduled_days,
    card.reps,
    card.lapses,
    card.state,
    card.last_review ? card.last_review.toISOString() : null,
  ];
}

const CARD_COLUMNS = `
  c.entry_id, c.list_id, c.due, c.stability, c.difficulty, c.elapsed_days,
  c.scheduled_days, c.reps, c.lapses, c.state, c.last_review, c.suspended
`;

/** Only cards whose word is still in the list count for anything. */
const LIVE_CARDS = `
  srs_cards c
  JOIN list_items li ON li.list_id = c.list_id AND li.entry_id = c.entry_id
`;

function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(",");
}

/**
 * The cards most at risk of being forgotten, across some lists.
 *
 * Params: `now` (ISO), the list ids, `now` again, then the limit. FSRS's
 * forgetting curve is a function of elapsed time over stability alone, so
 * ordering by that ratio, largest first, is the same as ordering by recall
 * probability, lowest first — without computing the curve for every row.
 */
export function reviewQueueSql(listCount: number): string {
  return `
    SELECT ${CARD_COLUMNS}
    FROM ${LIVE_CARDS}
    WHERE c.suspended = 0
      AND c.due <= ?
      AND c.list_id IN (${placeholders(listCount)})
    ORDER BY
      (julianday(?) - julianday(c.last_review)) / MAX(c.stability, 0.01) DESC,
      c.due ASC
    LIMIT ?
  `;
}

/**
 * Words in some lists that have never been rated, in the order worth learning
 * them. Params: the list ids, then the limit.
 *
 * Words looked up most often come first, which is what makes Searched Terms
 * self-prioritising. Then the newest additions. A list filled in one go, like
 * a JLPT copy, shares one `added_at`, so insertion order (the copy's own
 * common-first ordering) settles it.
 */
export function newQueueSql(listCount: number): string {
  return `
    SELECT li.entry_id, li.list_id
    FROM list_items li
    LEFT JOIN srs_cards c ON c.list_id = li.list_id AND c.entry_id = li.entry_id
    LEFT JOIN search_history sh ON sh.entry_id = li.entry_id
    WHERE c.entry_id IS NULL
      AND li.list_id IN (${placeholders(listCount)})
    ORDER BY COALESCE(sh.search_count, 0) DESC, li.added_at DESC, li.rowid ASC
    LIMIT ?
  `;
}

export const CARD_SQL = `
  SELECT ${CARD_COLUMNS}
  FROM srs_cards c
  WHERE c.entry_id = ? AND c.list_id = ?
`;

/** Params from `cardParams`. Suspension is left as it was. */
export const UPSERT_CARD_SQL = `
  INSERT INTO srs_cards (
    entry_id, list_id, due, stability, difficulty, elapsed_days,
    scheduled_days, reps, lapses, state, last_review
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(entry_id, list_id) DO UPDATE SET
    due = excluded.due,
    stability = excluded.stability,
    difficulty = excluded.difficulty,
    elapsed_days = excluded.elapsed_days,
    scheduled_days = excluded.scheduled_days,
    reps = excluded.reps,
    lapses = excluded.lapses,
    state = excluded.state,
    last_review = excluded.last_review
`;

/**
 * "I already know this." A word never rated has no row, so one is written
 * with an empty schedule; unsuspending it later makes it new again.
 * Params: entry id, list id.
 */
export const SUSPEND_SQL = `
  INSERT INTO srs_cards (entry_id, list_id, suspended)
  VALUES (?, ?, 1)
  ON CONFLICT(entry_id, list_id) DO UPDATE SET suspended = 1
`;

export const UNSUSPEND_SQL = `
  UPDATE srs_cards SET suspended = 0 WHERE entry_id = ? AND list_id = ?
`;

/** Words in a list marked as known, for the list page's restore line. */
export const SUSPENDED_COUNT_SQL = `
  SELECT COUNT(*) AS n FROM ${LIVE_CARDS} WHERE c.list_id = ? AND c.suspended = 1
`;

export const UNSUSPEND_ALL_SQL = `
  UPDATE srs_cards SET suspended = 0 WHERE list_id = ?
`;

// ---------------------------------------------------------------------------
// Progress

export interface ProgressRow {
  list_id: number;
  total: number;
  cards: number;
  suspended: number;
  learning: number;
  review: number;
  mastered: number;
  due: number;
}

/**
 * The buckets on the Study landing, for some lists. Params: `now` (ISO), then
 * the list ids. Only lists holding at least one live card come back, which is
 * exactly the "active" lists.
 */
export function progressSql(listCount: number): string {
  return `
    SELECT
      c.list_id,
      (SELECT COUNT(*) FROM list_items WHERE list_items.list_id = c.list_id) AS total,
      COUNT(*) AS cards,
      SUM(c.suspended = 1) AS suspended,
      SUM(c.suspended = 0 AND c.state IN (${State.Learning}, ${State.Relearning})) AS learning,
      SUM(c.suspended = 0 AND c.state = ${State.Review} AND c.stability < ${MASTERED_STABILITY}) AS review,
      SUM(c.suspended = 0 AND c.state = ${State.Review} AND c.stability >= ${MASTERED_STABILITY}) AS mastered,
      SUM(c.suspended = 0 AND c.due <= ?) AS due
    FROM ${LIVE_CARDS}
    WHERE c.list_id IN (${placeholders(listCount)})
    GROUP BY c.list_id
  `;
}

export function toProgress(row: ProgressRow): ListProgress {
  return {
    listId: row.list_id,
    total: row.total,
    newCount: row.total - row.cards,
    learning: row.learning,
    review: row.review,
    mastered: row.mastered,
    due: row.due,
    suspended: row.suspended,
  };
}

/** A list with nothing rated yet: everything is new. */
export function emptyProgress(listId: number, total: number): ListProgress {
  return {
    listId,
    total,
    newCount: total,
    learning: 0,
    review: 0,
    mastered: 0,
    due: 0,
    suspended: 0,
  };
}

/** Lists with at least one live card, most recently reviewed first. */
export const ACTIVE_LIST_IDS_SQL = `
  SELECT c.list_id
  FROM ${LIVE_CARDS}
  GROUP BY c.list_id
  ORDER BY MAX(c.last_review) DESC
`;

// ---------------------------------------------------------------------------
// Stats

export interface StatsRow {
  date: string;
  cards_reviewed: number;
  cards_correct: number;
  cards_again: number;
  cards_hard: number;
  cards_easy: number;
  session_count: number;
}

export function toDailyStats(row: StatsRow): DailyStats {
  return {
    date: row.date,
    reviewed: row.cards_reviewed,
    correct: row.cards_correct,
    again: row.cards_again,
    hard: row.cards_hard,
    easy: row.cards_easy,
    sessions: row.session_count,
  };
}

/**
 * The calendar day a moment falls on where the user is, as YYYY-MM-DD. Stats
 * are per local day: a review at 11pm belongs to today, not to tomorrow in UTC.
 */
export function dayKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Params: date, reviewed (1), correct (0/1), again, hard, easy. */
export const RECORD_REVIEW_SQL = `
  INSERT INTO study_stats (date, cards_reviewed, cards_correct, cards_again, cards_hard, cards_easy)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(date) DO UPDATE SET
    cards_reviewed = cards_reviewed + excluded.cards_reviewed,
    cards_correct = cards_correct + excluded.cards_correct,
    cards_again = cards_again + excluded.cards_again,
    cards_hard = cards_hard + excluded.cards_hard,
    cards_easy = cards_easy + excluded.cards_easy
`;

export const RECORD_SESSION_SQL = `
  INSERT INTO study_stats (date, session_count)
  VALUES (?, 1)
  ON CONFLICT(date) DO UPDATE SET session_count = session_count + 1
`;

export const STATS_FOR_DAY_SQL = `
  SELECT date, cards_reviewed, cards_correct, cards_again, cards_hard, cards_easy, session_count
  FROM study_stats
  WHERE date = ?
`;

/** Days with at least one review, newest first. */
export const STUDY_DAYS_SQL = `
  SELECT date FROM study_stats WHERE cards_reviewed > 0 ORDER BY date DESC
`;

/**
 * Consecutive days studied, counting back from today.
 *
 * A day not yet studied does not break the run — the streak is intact until
 * midnight passes without a review — so the count may start from yesterday.
 * `days` is newest first, as `STUDY_DAYS_SQL` returns it. Purely on the
 * YYYY-MM-DD strings, so no time zone can move a day.
 */
export function streakFrom(days: string[], today: string): number {
  if (days.length === 0) return 0;

  let expected = today;
  if (days[0] !== today) {
    expected = previousDay(today);
    if (days[0] !== expected) return 0;
  }

  let streak = 0;
  for (const day of days) {
    if (day !== expected) break;
    streak += 1;
    expected = previousDay(expected);
  }
  return streak;
}

function previousDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - 1));
  return date.toISOString().slice(0, 10);
}
