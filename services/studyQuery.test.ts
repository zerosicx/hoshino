import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { USER_SCHEMA, MIGRATIONS } from "@/services/schema";
import { Rating, State, schedule } from "@/services/scheduler";
import {
  ACTIVE_LIST_IDS_SQL,
  RECORD_REVIEW_SQL,
  SUSPEND_SQL,
  UNSUSPEND_SQL,
  UPSERT_CARD_SQL,
  cardParams,
  dayKey,
  newQueueSql,
  progressSql,
  reviewQueueSql,
  streakFrom,
  toProgress,
  toStudyCard,
  type CardRow,
  type ProgressRow,
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

function reviewQueue(listIds: number[], limit: number) {
  return (
    db.prepare(reviewQueueSql(listIds.length)).all(NOW, ...listIds, NOW, limit) as CardRow[]
  ).map((r) => r.entry_id);
}

function newQueue(listIds: number[], limit: number) {
  return (
    db.prepare(newQueueSql(listIds.length)).all(...listIds, limit) as { entry_id: number }[]
  ).map((r) => r.entry_id);
}

function progress(listId: number) {
  const row = db.prepare(progressSql(1)).get(NOW, listId) as ProgressRow | undefined;
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
  it("sorts the cards into buckets and counts the rest as new", () => {
    const list = createList("A");
    for (let id = 1; id <= 6; id++) addItem(list, id);
    reviewCard(list, 1, 45, 1); // mastered
    reviewCard(list, 2, 5, 1); //  review, not due
    reviewCard(list, 3, 1, 3); //  review, due
    db.prepare(UPSERT_CARD_SQL).run(...cardParams(4, list, schedule(null, Rating.Again, now))); // learning
    db.prepare(SUSPEND_SQL).run(5, list);

    expect(progress(list)).toEqual({
      listId: list,
      total: 6,
      newCount: 1,
      learning: 1,
      review: 2,
      mastered: 1,
      due: 1,
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
  it("accumulates one row per day", () => {
    const day = dayKey(now);
    db.prepare(RECORD_REVIEW_SQL).run(day, 1, 1, 0, 0, 0);
    db.prepare(RECORD_REVIEW_SQL).run(day, 1, 0, 1, 0, 0);
    db.prepare(RECORD_REVIEW_SQL).run(day, 1, 1, 0, 0, 1);

    const rows = db.prepare("SELECT * FROM study_stats").all() as Record<string, number>[];
    expect(rows).toHaveLength(1);
    expect(rows[0].cards_reviewed).toBe(3);
    expect(rows[0].cards_correct).toBe(2);
    expect(rows[0].cards_again).toBe(1);
    expect(rows[0].cards_easy).toBe(1);
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
