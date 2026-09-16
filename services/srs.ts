/**
 * Study cards: what to review, what a rating does, what a list has become.
 *
 * Scheduling itself is `scheduler.ts`; the SQL is `studyQuery.ts`. This file
 * joins the two to the user database.
 */

import { getUserDb } from "./database";
import { getList } from "./lists";
import { recordReview } from "./stats";
import { schedule, type Grade } from "./scheduler";
import {
  ACTIVE_LIST_IDS_SQL,
  CARD_SQL,
  SUSPEND_SQL,
  SUSPENDED_COUNT_SQL,
  UNSUSPEND_ALL_SQL,
  UNSUSPEND_SQL,
  UPSERT_CARD_SQL,
  cardParams,
  emptyProgress,
  newQueueSql,
  progressSql,
  reviewQueueSql,
  toProgress,
  toStudyCard,
  type CardRow,
  type ProgressRow,
} from "./studyQuery";
import type { ActiveList, ListProgress, StudyCard } from "@/types/study";

/**
 * Today's pile: `size` cards, the ones most at risk of being forgotten first,
 * topped up with never-seen words only when fewer than `size` are waiting —
 * or not at all, for a review-only session.
 *
 * The pile is the same size whether one day or ten were missed. Missed reviews
 * are not a debt to FSRS: a late card is scheduled from the time that actually
 * passed, so nothing needs catching up, and the count shown is always one the
 * user can finish.
 */
export interface SessionOptions {
  /** Due cards only — no new words are added to fill the pile. */
  reviewOnly?: boolean;
}

export async function buildSession(
  listIds: number[],
  size: number,
  now = new Date(),
  options: SessionOptions = {}
): Promise<StudyCard[]> {
  if (listIds.length === 0 || size <= 0) return [];
  const db = getUserDb();

  const reviews = await db.getAllAsync<CardRow>(reviewQueueSql(listIds.length), [
    now.toISOString(),
    ...listIds,
    now.toISOString(),
    size,
  ]);
  const session = reviews.map(toStudyCard);

  const room = options.reviewOnly ? 0 : size - session.length;
  if (room > 0) {
    const fresh = await db.getAllAsync<{ entry_id: number; list_id: number }>(
      newQueueSql(listIds.length),
      [...listIds, room]
    );
    for (const row of fresh) {
      session.push({
        entryId: row.entry_id,
        listId: row.list_id,
        card: null,
        suspended: false,
      });
    }
  }

  return session;
}

/**
 * Applies a rating: reschedules the card, writes it, and counts the review
 * in today's stats — one transaction, so a crash mid-way loses the rating
 * rather than half-recording it.
 */
export async function rateCard(
  item: StudyCard,
  rating: Grade,
  now = new Date()
): Promise<StudyCard> {
  const next = schedule(item.card, rating, now);
  const db = getUserDb();

  await db.withTransactionAsync(async () => {
    await db.runAsync(UPSERT_CARD_SQL, cardParams(item.entryId, item.listId, next));
    await recordReview(rating, now);
  });

  return { ...item, card: next };
}

export async function getCard(
  entryId: number,
  listId: number
): Promise<StudyCard | null> {
  const row = await getUserDb().getFirstAsync<CardRow>(CARD_SQL, [entryId, listId]);
  return row ? toStudyCard(row) : null;
}

/** "I already know this": the word leaves the pile until unsuspended. */
export async function suspendCard(entryId: number, listId: number): Promise<void> {
  await getUserDb().runAsync(SUSPEND_SQL, [entryId, listId]);
}

export async function unsuspendCard(entryId: number, listId: number): Promise<void> {
  await getUserDb().runAsync(UNSUSPEND_SQL, [entryId, listId]);
}

export async function getSuspendedCount(listId: number): Promise<number> {
  const row = await getUserDb().getFirstAsync<{ n: number }>(SUSPENDED_COUNT_SQL, [listId]);
  return row?.n ?? 0;
}

/** Brings every word marked as known in a list back into study. */
export async function unsuspendAll(listId: number): Promise<void> {
  await getUserDb().runAsync(UNSUSPEND_ALL_SQL, [listId]);
}

/** Progress per list, keyed by list id. Lists with no cards yet are all-new. */
export async function getProgress(
  lists: { id: number; itemCount: number }[],
  now = new Date()
): Promise<Map<number, ListProgress>> {
  const out = new Map<number, ListProgress>();
  if (lists.length === 0) return out;

  const rows = await getUserDb().getAllAsync<ProgressRow>(
    progressSql(lists.length),
    [now.toISOString(), ...lists.map((l) => l.id)]
  );
  for (const row of rows) out.set(row.list_id, toProgress(row));

  for (const list of lists) {
    if (!out.has(list.id)) out.set(list.id, emptyProgress(list.id, list.itemCount));
  }
  return out;
}

/** Lists with study progress, most recently reviewed first. */
export async function getActiveLists(now = new Date()): Promise<ActiveList[]> {
  const ids = (
    await getUserDb().getAllAsync<{ list_id: number }>(ACTIVE_LIST_IDS_SQL)
  ).map((r) => r.list_id);
  if (ids.length === 0) return [];

  const lists = (await Promise.all(ids.map(getList))).filter(
    (l): l is NonNullable<typeof l> => l !== null
  );
  const progress = await getProgress(lists, now);

  return lists.map((list) => ({ list, progress: progress.get(list.id)! }));
}

/** Due cards across the active lists, for the landing's due bar. */
export async function getTotalDue(now = new Date()): Promise<number> {
  const active = await getActiveLists(now);
  return active.reduce((sum, a) => sum + a.progress.due, 0);
}
