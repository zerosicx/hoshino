import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { USER_SCHEMA, BUILT_IN_LISTS, MIGRATIONS } from "@/services/schema";
import {
  LIST_ITEM_IDS_SQL,
  MOST_RECENT_LIST_SQL,
  customListsSql,
  jlptListsSql,
  visibleListsSql,
} from "@/services/listQuery";

let db: Database.Database;

/** Older than any timestamp the tests write, so ordering is unambiguous. */
const EPOCH = "2020-01-01T00:00:00.000Z";

function seedBuiltIns() {
  const insert = db.prepare(
    "INSERT INTO lists (name, type, jlpt_level, created_at) VALUES (?, ?, ?, ?)"
  );
  for (const l of BUILT_IN_LISTS) insert.run(l.name, l.type, l.level, EPOCH);
}

function createList(name: string, createdAt: string): number {
  const info = db
    .prepare(
      "INSERT INTO lists (name, type, jlpt_level, created_at) VALUES (?, 'custom', NULL, ?)"
    )
    .run(name, createdAt);
  return Number(info.lastInsertRowid);
}

function addItem(listId: number, entryId: number, addedAt: string) {
  db.prepare(
    "INSERT INTO list_items (list_id, entry_id, added_at) VALUES (?, ?, ?)"
  ).run(listId, entryId, addedAt);
}

function star(listId: number) {
  db.prepare("UPDATE lists SET starred = 1 WHERE id = ?").run(listId);
}

function visibleNames(): string[] {
  return db
    .prepare(visibleListsSql())
    .all()
    .map((r) => (r as { name: string }).name);
}

beforeEach(() => {
  db = new Database(":memory:");
  db.exec(USER_SCHEMA);
});

afterEach(() => db.close());

describe("user schema", () => {
  it("matches what the migrations expect to add", () => {
    // A migration for a column the fresh schema never creates would silently
    // never run on new installs.
    for (const m of MIGRATIONS) {
      const columns = db
        .prepare(`PRAGMA table_info(${m.table})`)
        .all()
        .map((c) => (c as { name: string }).name);
      expect(columns).toContain(m.column);
    }
  });

  it("brings an older database up to date", () => {
    const old = new Database(":memory:");
    old.exec(`
      CREATE TABLE lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        jlpt_level INTEGER,
        created_at TEXT NOT NULL
      );
    `);
    old.prepare(
      "INSERT INTO lists (name, type, created_at) VALUES ('Mine', 'custom', ?)"
    ).run(EPOCH);

    for (const m of MIGRATIONS) old.exec(m.sql);

    const row = old.prepare("SELECT starred FROM lists").get() as {
      starred: number;
    };
    expect(row.starred).toBe(0);
    old.close();
  });
});

describe("visible lists", () => {
  it("hides JLPT lists until they are starred", () => {
    seedBuiltIns();
    expect(visibleNames()).toEqual(["Searched Terms"]);

    const n5 = db
      .prepare("SELECT id FROM lists WHERE name = 'JLPT N5 Vocabulary'")
      .get() as { id: number };
    star(n5.id);

    expect(visibleNames()).toContain("JLPT N5 Vocabulary");
  });

  it("puts Searched Terms first while nothing is starred", () => {
    seedBuiltIns();
    createList("Verbs", "2024-05-01T00:00:00.000Z");
    createList("Food", "2024-06-01T00:00:00.000Z");

    expect(visibleNames()).toEqual(["Searched Terms", "Food", "Verbs"]);
  });

  it("puts starred lists above Searched Terms", () => {
    seedBuiltIns();
    createList("Verbs", "2024-05-01T00:00:00.000Z");
    const food = createList("Food", "2024-06-01T00:00:00.000Z");
    star(food);

    expect(visibleNames()).toEqual(["Food", "Searched Terms", "Verbs"]);
  });

  it("orders by the most recent item, not the creation date", () => {
    seedBuiltIns();
    const verbs = createList("Verbs", "2024-05-01T00:00:00.000Z");
    createList("Food", "2024-06-01T00:00:00.000Z");

    // Verbs is older but has just been added to, so it should come first.
    addItem(verbs, 1, "2024-07-01T00:00:00.000Z");

    expect(visibleNames()).toEqual(["Searched Terms", "Verbs", "Food"]);
  });

  it("falls back to the creation date for an empty list", () => {
    seedBuiltIns();
    createList("Older", "2024-01-01T00:00:00.000Z");
    createList("Newer", "2024-02-01T00:00:00.000Z");

    expect(visibleNames()).toEqual(["Searched Terms", "Newer", "Older"]);
  });

  it("counts items per list", () => {
    seedBuiltIns();
    const verbs = createList("Verbs", "2024-05-01T00:00:00.000Z");
    addItem(verbs, 1, "2024-05-02T00:00:00.000Z");
    addItem(verbs, 2, "2024-05-03T00:00:00.000Z");

    const rows = db.prepare(visibleListsSql()).all() as {
      name: string;
      item_count: number;
    }[];
    const verbsRow = rows.find((r) => r.name === "Verbs");
    expect(verbsRow?.item_count).toBe(2);
  });

  it("reports starred as a usable flag", () => {
    seedBuiltIns();
    const food = createList("Food", "2024-06-01T00:00:00.000Z");
    star(food);

    const rows = db.prepare(visibleListsSql()).all() as {
      name: string;
      starred: number;
    }[];
    expect(rows.find((r) => r.name === "Food")?.starred).toBe(1);
    expect(rows.find((r) => r.name === "Searched Terms")?.starred).toBe(0);
  });
});

describe("the JLPT section", () => {
  it("lists vocabulary and kanji from N5 up to N1", () => {
    seedBuiltIns();
    const names = db
      .prepare(jlptListsSql())
      .all()
      .map((r) => (r as { name: string }).name);

    expect(names).toEqual([
      "JLPT N5 Vocabulary",
      "JLPT N5 Kanji",
      "JLPT N4 Vocabulary",
      "JLPT N4 Kanji",
      "JLPT N3 Vocabulary",
      "JLPT N3 Kanji",
      "JLPT N2 Vocabulary",
      "JLPT N2 Kanji",
      "JLPT N1 Vocabulary",
      "JLPT N1 Kanji",
    ]);
  });

  it("shows every JLPT list whether starred or not", () => {
    seedBuiltIns();
    const n5 = db
      .prepare("SELECT id FROM lists WHERE name = 'JLPT N5 Kanji'")
      .get() as { id: number };
    star(n5.id);

    expect(db.prepare(jlptListsSql()).all()).toHaveLength(10);
  });
});

describe("most recent list", () => {
  it("is the one to add to when swiping", () => {
    seedBuiltIns();
    createList("Verbs", "2024-05-01T00:00:00.000Z");
    const food = createList("Food", "2024-06-01T00:00:00.000Z");
    addItem(food, 1, "2024-07-01T00:00:00.000Z");

    const row = db.prepare(MOST_RECENT_LIST_SQL).get() as { name: string };
    expect(row.name).toBe("Food");
  });

  it("ignores built-in lists, which are not somewhere to collect words", () => {
    seedBuiltIns();
    const row = db.prepare(MOST_RECENT_LIST_SQL).get();
    expect(row).toBeUndefined();
  });

  it("offers every custom list for the add-to-list drawer, recent first", () => {
    seedBuiltIns();
    const verbs = createList("Verbs", "2024-05-01T00:00:00.000Z");
    createList("Food", "2024-06-01T00:00:00.000Z");
    addItem(verbs, 1, "2024-07-01T00:00:00.000Z");

    const names = db
      .prepare(customListsSql())
      .all()
      .map((r) => (r as { name: string }).name);

    // Starring must not reorder this one: it is about where words were last put.
    expect(names).toEqual(["Verbs", "Food"]);
  });
});

describe("list items", () => {
  it("returns entry ids newest first", () => {
    const verbs = createList("Verbs", EPOCH);
    addItem(verbs, 10, "2024-01-01T00:00:00.000Z");
    addItem(verbs, 20, "2024-03-01T00:00:00.000Z");
    addItem(verbs, 30, "2024-02-01T00:00:00.000Z");

    const ids = db
      .prepare(LIST_ITEM_IDS_SQL)
      .all(verbs)
      .map((r) => (r as { entry_id: number }).entry_id);

    expect(ids).toEqual([20, 30, 10]);
  });
});
