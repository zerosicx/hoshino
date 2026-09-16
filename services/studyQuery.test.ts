import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { USER_SCHEMA, MIGRATIONS } from "@/services/schema";
import { Rating, State, schedule } from "@/services/scheduler";
import {
  ACTIVE_LIST_IDS_SQL,
  LEARN_AHEAD_MS,
  LIST_CARDS_SQL,
  NEW_TODAY_SQL,
  RECORD_REVIEW_SQL,
  STATS_FOR_DAY_SQL,
  SUSPEND_SQL,
  UNSUSPEND_SQL,
  UPSERT_CARD_SQL,
  cardParams,
  dayKey,
  newAllowance,
  newQueueSql,
  previewSession,
  progressParams,
  progressSql,
  reviewDeltaParams,
  reviewQueueParams,
  reviewQueueSql,
  streakFrom,
  toDailyStats,
  toProgress,
  toStudyCard,
  type CardRow,
  type ProgressRow,
  type StatsRow,
} from "@/services/studyQuery";
import { JLPT_COPY_SQL, CREATE_JLPT_COPY_SQL } from "@/services/listQuery";

let db: Database.Database;

const now = new Date("2026-09-15T10:00:00.000Z");
const NOW = now.toISOString();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

function createList(name: string, type = "custom"): number {
  return Number(
    db
      .prepare("INSERT INTO lists (name, type, jlpt_level, created_at) VALUES (?, ?, NULL, ?)")
      .run(name, type, "2020-01-01T00:00:00.000Z").lastInsertRowid
  );
}

function addItem(listId: number, entryId: number, addedAt = "2020-01-01T00:00:00.000Z") {
  db.prepare("INSERT INTO list_items (list_id, entry_id, added_at) VALUES (?, ?, ?)").run(
    listId,
    entryId,
    addedAt
  );
}

/** A card in review with the given stability, last seen `elapsed` days ago. */
function reviewCard(listId: number, entryId: number, stability: number, elapsed: number) {
  const last = daysAgo(elapsed);
  db.prepare(UPSERT_CARD_SQL).run(
    ...cardParams(entryId, listId, {
      due: new Date(last.getTime() + stability * 86_400_000),
      stability,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: stability,
      reps: 3,
      lapses: 0,
      state: State.Review,
      last_review: last,
    })
  );
}

/** A card in the minute loop, due at a given moment. */
function learningCard(listId: number, entryId: number, due: Date, state = State.Learning) {
  db.prepare(UPSERT_CARD_SQL).run(
    ...cardParams(entryId, listId, {
      due,
      stability: 0.5,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 1,
      lapses: 0,
      state,
      last_review: daysAgo(0),
    })
  );
}

function reviewQueue(listIds: number[], limit: number) {
  return (
    db.prepare(reviewQueueSql(listIds.length)).all(...reviewQueueParams(listIds, now, limit)) as CardRow[]
  ).map((r) => r.entry_id);
}

function newQueue(listIds: number[], limit: number) {
  return (
    db.prepare(newQueueSql(listIds.length)).all(...listIds, limit) as { entry_id: number }[]
  ).map((r) => r.entry_id);
}

function progress(listId: number) {
  const row = db.prepare(progressSql(1)).get(...progressParams([listId], now)) as ProgressRow | undefined;
  return row ? toProgress(row) : null;
}

beforeEach(() => {
  db = new Database(":memory:");
  db.exec(USER_SCHEMA);
});

afterEach(() => db.close());

describe("schema", () => {
  it("adds suspended to a beta database that predates it", () => {
    const old = new Database(":memory:");
    old.exec(`
      CREATE TABLE srs_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL,
        list_id INTEGER NOT NULL,
        due TEXT, stability REAL DEFAULT 0, difficulty REAL DEFAULT 0,
        elapsed_days INTEGER DEFAULT 0, scheduled_days INTEGER DEFAULT 0,
        reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0, state INTEGER DEFAULT 0,
        last_review TEXT
      );
    `);
    for (const m of MIGRATIONS.filter((m) => m.table === "srs_cards")) old.exec(m.sql);
    old.exec(USER_SCHEMA);

    const columns = old.prepare("PRAGMA table_info(srs_cards)").all().map((c) => (c as { name: string }).name);
    expect(columns).toContain("suspended");
    // The unique index the upsert relies on has to exist on the old table too.
    expect(() => old.prepare(SUSPEND_SQL).run(1, 1)).not.toThrow();
    old.close();
  });

  it("adds the new-word counters to a study_stats table that predates them", () => {
    const old = new Database(":memory:");
    old.exec(`
      CREATE TABLE study_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE NOT NULL,
        cards_reviewed INTEGER DEFAULT 0, cards_correct INTEGER DEFAULT 0,
        cards_again INTEGER DEFAULT 0, cards_hard INTEGER DEFAULT 0,
        cards_easy INTEGER DEFAULT 0, session_count INTEGER DEFAULT 0,
        streak_length INTEGER DEFAULT 0
      );
    `);
    old.prepare("INSERT INTO study_stats (date, cards_reviewed) VALUES ('2026-09-01', 4)").run();
    for (const m of MIGRATIONS.filter((m) => m.table === "study_stats")) old.exec(m.sql);
    old.exec(USER_SCHEMA);

    const columns = old.prepare("PRAGMA table_info(study_stats)").all().map((c) => (c as { name: string }).name);
    expect(columns).toEqual(expect.arrayContaining(["cards_new", "cards_learned"]));
    // Old rows read as zero, and the new upsert works against the old table.
    expect(old.prepare(NEW_TODAY_SQL).get("2026-09-01")).toEqual({ n: 0 });
    expect(() =>
      old.prepare(RECORD_REVIEW_SQL).run(...reviewDeltaParams("2026-09-01", { again: 0, hard: 0, easy: 0, introduced: 1, learned: 0 }))
    ).not.toThrow();
    expect(old.prepare(NEW_TODAY_SQL).get("2026-09-01")).toEqual({ n: 1 });
    old.close();
  });

  it("holds one card per word per list", () => {
    const list = createList("A");
    addItem(list, 1);
    const card = schedule(null, Rating.Good, now);
    db.prepare(UPSERT_CARD_SQL).run(...cardParams(1, list, card));
    db.prepare(UPSERT_CARD_SQL).run(...cardParams(1, list, { ...card, reps: 9 }));

    const rows = db.prepare("SELECT reps FROM srs_cards").all() as { reps: number }[];
    expect(rows).toEqual([{ reps: 9 }]);
  });
});

describe("cards round-trip", () => {
  it("reads back what FSRS wrote", () => {
    const list = createList("A");
    addItem(list, 7);
    const card = schedule(null, Rating.Hard, now);
    db.prepare(UPSERT_CARD_SQL).run(...cardParams(7, list, card));

    const row = db.prepare("SELECT *, 0 AS _ FROM srs_cards").get() as CardRow;
    const back = toStudyCard(row);
    expect(back.entryId).toBe(7);
    expect(back.card?.due.toISOString()).toBe(card.due.toISOString());
    expect(back.card?.stability).toBe(card.stability);
    expect(back.card?.state).toBe(card.state);
    expect(back.card?.last_review?.toISOString()).toBe(now.toISOString());
    expect(back.suspended).toBe(false);
  });
});

describe("the review queue", () => {
  it("puts the card most likely forgotten first, whatever its due date says", () => {
    const list = createList("A");
    for (const id of [1, 2, 3]) addItem(list, id);
    // Same lateness in days, very different stability: the fragile one is at risk.
    reviewCard(list, 1, 30, 32); // strong, two days late
    reviewCard(list, 2, 2, 4); //   fragile, two days late
    reviewCard(list, 3, 10, 5); //  not due yet

    expect(reviewQueue([list], 10)).toEqual([2, 1]);
  });

  it("leaves out suspended cards and words no longer in the list", () => {
    const list = createList("A");
    addItem(list, 1);
    addItem(list, 2);
    reviewCard(list, 1, 1, 5);
    reviewCard(list, 2, 1, 5);
    reviewCard(list, 3, 1, 5); // never added to list_items
    db.prepare(SUSPEND_SQL).run(2, list);

    expect(reviewQueue([list], 10)).toEqual([1]);

    db.prepare(UNSUSPEND_SQL).run(2, list);
    expect(reviewQueue([list], 10)).toHaveLength(2);
  });

  it("is capped, so a backlog never shows as more than the pile", () => {
    const list = createList("A");
    for (let id = 1; id <= 50; id++) {
      addItem(list, id);
      reviewCard(list, id, 1, 10);
    }
    expect(reviewQueue([list], 20)).toHaveLength(20);
  });

  it("spans several lists", () => {
    const a = createList("A");
    const b = createList("B");
    addItem(a, 1);
    addItem(b, 2);
    reviewCard(a, 1, 1, 3);
    reviewCard(b, 2, 1, 3);
    expect(reviewQueue([a, b], 10)).toHaveLength(2);
    expect(reviewQueue([a], 10)).toEqual([1]);
  });

  it("takes cards in the minute loop up to twenty minutes early, and review cards only when due", () => {
    const list = createList("A");
    for (const id of [1, 2, 3, 4, 5]) addItem(list, id);
    const soon = new Date(now.getTime() + 10 * 60_000);
    const later = new Date(now.getTime() + LEARN_AHEAD_MS + 60_000);
    learningCard(list, 1, soon); //                    Learning, due in 10 min: in
    learningCard(list, 2, soon, State.Relearning); //  Relearning, due in 10 min: in
    learningCard(list, 3, later); //                   Learning, due in 21 min: out
    learningCard(list, 4, daysAgo(0)); //              Learning, due now: in
    reviewCard(list, 5, 1, 0.99); //                   Review, due in 15 min: out

    expect(reviewQueue([list], 10).sort()).toEqual([1, 2, 4]);
    // The progress count agrees with the queue, so the bar never lies.
    expect(progress(list)?.due).toBe(3);
  });

  it("lists every live card of a list by word, for the stage beside each row", () => {
    const list = createList("A");
    addItem(list, 1);
    addItem(list, 2);
    reviewCard(list, 1, 10, 1);
    reviewCard(list, 3, 10, 1); // not in the list
    const rows = db.prepare(LIST_CARDS_SQL).all(list) as CardRow[];
    expect(rows.map((r) => r.entry_id)).toEqual([1]);
    expect(toStudyCard(rows[0]).card?.stability).toBe(10);
  });
});

describe("the new-word budget", () => {
  it("a mixed session spends what is left of today's budget, within the room", () => {
    expect(newAllowance("mixed", 14, 10, 0)).toBe(10);
    expect(newAllowance("mixed", 14, 10, 6)).toBe(4);
    expect(newAllowance("mixed", 2, 10, 6)).toBe(2);
    expect(newAllowance("mixed", 14, 10, 10)).toBe(0);
    expect(newAllowance("mixed", 14, 10, 12)).toBe(0);
  });

  it("a review session adds nothing; a learn session fills the room past the budget", () => {
    expect(newAllowance("review", 14, 10, 0)).toBe(0);
    expect(newAllowance("learn", 14, 10, 10)).toBe(14);
    expect(newAllowance("learn", 0, 10, 0)).toBe(0);
    expect(newAllowance("mixed", -2, 10, 0)).toBe(0);
  });

  it("previews what the bar promises: due capped at the session, new within budget and supply", () => {
    const settings = { sessionSize: 20, newPerDay: 10 };
    expect(previewSession({ due: 6, unseen: 100, newToday: 6 }, settings)).toEqual({ due: 6, fresh: 4, budgetSpent: false });
    expect(previewSession({ due: 340, unseen: 100, newToday: 0 }, settings)).toEqual({ due: 20, fresh: 0, budgetSpent: false });
    expect(previewSession({ due: 0, unseen: 3, newToday: 0 }, settings)).toEqual({ due: 0, fresh: 3, budgetSpent: false });
    expect(previewSession({ due: 0, unseen: 100, newToday: 10 }, settings)).toEqual({ due: 0, fresh: 0, budgetSpent: true });
  });
});

describe("the new queue", () => {
  it("is the words without a card, most looked-up first, then newest", () => {
    const list = createList("Searched Terms", "system");
    addItem(list, 1, "2026-01-01T00:00:00.000Z");
    addItem(list, 2, "2026-02-01T00:00:00.000Z");
    addItem(list, 3, "2026-03-01T00:00:00.000Z");
    addItem(list, 4, "2026-04-01T00:00:00.000Z");
    db.prepare("INSERT INTO search_history (entry_id, searched_at, search_count) VALUES (1, ?, 5)").run(NOW);
    reviewCard(list, 4, 1, 1); // already studied

    expect(newQueue([list], 10)).toEqual([1, 3, 2]);
  });

  it("falls back to insertion order when everything was added at once", () => {
    const list = createList("JLPT N5 Vocabulary");
    for (const id of [30, 10, 20]) addItem(list, id, NOW);
    expect(newQueue([list], 10)).toEqual([30, 10, 20]);
  });

  it("does not offer a suspended word as new", () => {
    const list = createList("A");
    addItem(list, 1);
    addItem(list, 2);
    db.prepare(SUSPEND_SQL).run(1, list);
    expect(newQueue([list], 10)).toEqual([2]);
  });
});

describe("progress", () => {
  it("sorts the cards onto the mastery ladder and counts the rest as new", () => {
    const list = createList("A");
    for (let id = 1; id <= 8; id++) addItem(list, id);
    reviewCard(list, 1, 45, 1); //  mastered
    reviewCard(list, 2, 12, 1); //  known, not due
    reviewCard(list, 3, 5, 1); //   familiar, not due
    reviewCard(list, 4, 1, 3); //   familiar, due
    reviewCard(list, 5, 0.5, 0); // review state but under a day: learning
    db.prepare(UPSERT_CARD_SQL).run(...cardParams(6, list, schedule(null, Rating.Again, now))); // learning, due in a minute
    db.prepare(SUSPEND_SQL).run(7, list);

    expect(progress(list)).toEqual({
      listId: list,
      total: 8,
      newCount: 1,
      learning: 2,
      familiar: 2,
      known: 1,
      mastered: 1,
      due: 2,
      suspended: 1,
    });
  });

  it("returns nothing for a list with no cards, so the caller fills it in", () => {
    const list = createList("A");
    addItem(list, 1);
    expect(progress(list)).toBeNull();
  });

  it("lists active lists by most recent review", () => {
    const a = createList("A");
    const b = createList("B");
    const c = createList("C");
    addItem(a, 1);
    addItem(b, 2);
    addItem(c, 3);
    reviewCard(a, 1, 1, 5);
    reviewCard(b, 2, 1, 1);

    const ids = (db.prepare(ACTIVE_LIST_IDS_SQL).all() as { list_id: number }[]).map((r) => r.list_id);
    expect(ids).toEqual([b, a]);
  });
});

describe("stats", () => {
  const none = { again: 0, hard: 0, easy: 0, introduced: 0, learned: 0 };

  it("accumulates one row per day, with introductions and graduations", () => {
    const day = dayKey(now);
    db.prepare(RECORD_REVIEW_SQL).run(...reviewDeltaParams(day, { ...none, introduced: 1 }));
    db.prepare(RECORD_REVIEW_SQL).run(...reviewDeltaParams(day, { ...none, again: 1 }));
    db.prepare(RECORD_REVIEW_SQL).run(...reviewDeltaParams(day, { ...none, easy: 1, introduced: 1, learned: 1 }));
    db.prepare(RECORD_REVIEW_SQL).run(...reviewDeltaParams(dayKey(daysAgo(1)), { ...none, introduced: 1 }));

    const rows = db.prepare("SELECT * FROM study_stats ORDER BY date DESC").all() as Record<string, number>[];
    expect(rows).toHaveLength(2);
    expect(rows[0].cards_reviewed).toBe(3);
    expect(rows[0].cards_again).toBe(1);
    expect(rows[0].cards_easy).toBe(1);
    expect(rows[0].cards_new).toBe(2);
    expect(rows[0].cards_learned).toBe(1);

    const today = toDailyStats(db.prepare(STATS_FOR_DAY_SQL).get(day) as StatsRow);
    expect(today).toMatchObject({ reviewed: 3, introduced: 2, learned: 1, sessions: 0 });
  });

  it("counts today's new words for the budget, zero before any", () => {
    const day = dayKey(now);
    expect(db.prepare(NEW_TODAY_SQL).get(day)).toBeUndefined();
    db.prepare(RECORD_REVIEW_SQL).run(...reviewDeltaParams(day, { ...none, introduced: 1 }));
    db.prepare(RECORD_REVIEW_SQL).run(...reviewDeltaParams(day, { ...none, introduced: 1 }));
    db.prepare(RECORD_REVIEW_SQL).run(...reviewDeltaParams(day, { ...none }));
    expect(db.prepare(NEW_TODAY_SQL).get(day)).toEqual({ n: 2 });
  });

  it("keys days locally", () => {
    // 23:30 local on the 15th must not become the 16th because UTC says so.
    const late = new Date(2026, 8, 15, 23, 30);
    expect(dayKey(late)).toBe("2026-09-15");
  });
});

describe("streakFrom", () => {
  it("counts consecutive days back from today", () => {
    expect(streakFrom(["2026-09-15", "2026-09-14", "2026-09-13"], "2026-09-15")).toBe(3);
  });

  it("survives a day not yet studied", () => {
    expect(streakFrom(["2026-09-14", "2026-09-13"], "2026-09-15")).toBe(2);
  });

  it("ends at the first gap", () => {
    expect(streakFrom(["2026-09-15", "2026-09-13"], "2026-09-15")).toBe(1);
    expect(streakFrom(["2026-09-12"], "2026-09-15")).toBe(0);
    expect(streakFrom([], "2026-09-15")).toBe(0);
  });

  it("crosses a month boundary", () => {
    expect(streakFrom(["2026-09-01", "2026-08-31"], "2026-09-01")).toBe(2);
  });
});

describe("JLPT copies", () => {
  it("finds the user's copy by level and never the reference", () => {
    db.prepare("INSERT INTO lists (name, type, jlpt_level, created_at) VALUES ('JLPT N5 Vocabulary', 'jlpt_vocab', 5, ?)").run(NOW);
    expect(db.prepare(JLPT_COPY_SQL).get(5)).toBeUndefined();

    db.prepare(CREATE_JLPT_COPY_SQL).run("JLPT N5 Vocabulary", 5, NOW);
    const copy = db.prepare(JLPT_COPY_SQL).get(5) as { type: string; jlpt_level: number };
    expect(copy.type).toBe("custom");
    expect(copy.jlpt_level).toBe(5);
    expect(db.prepare(JLPT_COPY_SQL).get(4)).toBeUndefined();
  });
});
