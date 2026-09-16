/**
 * The writable user database.
 *
 * Kept apart from `database.ts` so tests can build the same schema in a plain
 * SQLite file without pulling in expo-sqlite, which does not run under Node.
 */

export const USER_SCHEMA = `
CREATE TABLE IF NOT EXISTS srs_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL,
  list_id INTEGER NOT NULL,
  due TEXT,
  stability REAL DEFAULT 0,
  difficulty REAL DEFAULT 0,
  elapsed_days INTEGER DEFAULT 0,
  scheduled_days INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  state INTEGER DEFAULT 0,
  last_review TEXT,
  suspended INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  jlpt_level INTEGER,
  created_at TEXT NOT NULL,
  starred INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS list_items (
  list_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  added_at TEXT NOT NULL,
  PRIMARY KEY (list_id, entry_id)
);

CREATE TABLE IF NOT EXISTS search_history (
  entry_id INTEGER PRIMARY KEY,
  searched_at TEXT NOT NULL,
  search_count INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS study_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT UNIQUE NOT NULL,
  cards_reviewed INTEGER DEFAULT 0,
  cards_correct INTEGER DEFAULT 0,
  cards_again INTEGER DEFAULT 0,
  cards_hard INTEGER DEFAULT 0,
  cards_easy INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  streak_length INTEGER DEFAULT 0,
  cards_new INTEGER DEFAULT 0,
  cards_learned INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_srs_cards_entry_list ON srs_cards(entry_id, list_id);
CREATE INDEX IF NOT EXISTS idx_srs_cards_due ON srs_cards(due);
CREATE INDEX IF NOT EXISTS idx_srs_cards_entry ON srs_cards(entry_id);
CREATE INDEX IF NOT EXISTS idx_srs_cards_list ON srs_cards(list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_entry ON list_items(entry_id);
`;

/**
 * Lists the app provides rather than the user creating.
 *
 * The JLPT lists hold no rows in `list_items`. Their contents come from
 * `jlpt_level` on the dictionary's own tables, so they cost ten rows here
 * instead of the ~9,700 it would take to materialise them.
 */
export const BUILT_IN_LISTS: {
  name: string;
  type: string;
  level: number | null;
}[] = [
  { name: "Searched Terms", type: "system", level: null },
  ...[5, 4, 3, 2, 1].flatMap((level) => [
    { name: `JLPT N${level} Vocabulary`, type: "jlpt_vocab", level },
    { name: `JLPT N${level} Kanji`, type: "jlpt_kanji", level },
  ]),
];

/**
 * Applied on top of `USER_SCHEMA` for databases an earlier build already
 * created, which `CREATE TABLE IF NOT EXISTS` leaves untouched.
 */
export const MIGRATIONS: { table: string; column: string; sql: string }[] = [
  {
    table: "lists",
    column: "starred",
    sql: "ALTER TABLE lists ADD COLUMN starred INTEGER NOT NULL DEFAULT 0",
  },
  {
    table: "srs_cards",
    column: "suspended",
    sql: "ALTER TABLE srs_cards ADD COLUMN suspended INTEGER NOT NULL DEFAULT 0",
  },
  {
    table: "study_stats",
    column: "cards_new",
    sql: "ALTER TABLE study_stats ADD COLUMN cards_new INTEGER DEFAULT 0",
  },
  {
    table: "study_stats",
    column: "cards_learned",
    sql: "ALTER TABLE study_stats ADD COLUMN cards_learned INTEGER DEFAULT 0",
  },
];
