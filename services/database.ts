import { Asset } from "expo-asset";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import { openDictionary } from "./sqliteWasm";

const DICT_ASSET_ID = require("../assets/hoshino.db") as number;
const DICT_DB_NAME = "hoshino.db";

/**
 * The read-only slice of expo-sqlite's API that dictionary queries use.
 *
 * Web serves the dictionary from the official SQLite WebAssembly build instead
 * of expo-sqlite, so this describes what both implementations provide. Only
 * strings and numbers are ever bound in dictionary queries.
 */
export type DictionaryBindValue = string | number | null;

export type DictionaryDb = {
  getAllAsync<T>(source: string): Promise<T[]>;
  getAllAsync<T>(source: string, params: DictionaryBindValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string): Promise<T | null>;
  getFirstAsync<T>(
    source: string,
    params: DictionaryBindValue[]
  ): Promise<T | null>;
};

let dictDbInstance: DictionaryDb | null = null;
let userDbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Names the step a failure came from.
 *
 * SQLite opens files lazily, so a failure usually surfaces well after the call
 * that caused it. Without the step name attached, the error reads as an opaque
 * code with no indication of which stage produced it.
 */
async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `?? [DB] failed at "${label}" after ${Date.now() - started}ms:`,
      err
    );
    throw new Error(`${label} — ${message}`);
  }
}

/**
 * Opens the read-only dictionary.
 *
 * Native imports the asset into the app's SQLite directory and opens it from
 * disk. Web cannot use expo-sqlite at all for this file: its WebAssembly build
 * omits FTS5, and a build without that module cannot read a schema declaring
 * `CREATE VIRTUAL TABLE ... USING fts5`. So web hands the asset to a worker
 * running the official SQLite WASM build, which ships FTS5 and can cache the
 * file in OPFS.
 */
async function openDictionaryDb(): Promise<DictionaryDb> {
  if (Platform.OS !== "web") {
    await step("import dictionary asset", () =>
      SQLite.importDatabaseFromAssetAsync(DICT_DB_NAME, {
        assetId: DICT_ASSET_ID,
        forceOverwrite: true,
      })
    );

    return step("open dictionary db", () =>
      SQLite.openDatabaseAsync(DICT_DB_NAME)
    );
  }

  const asset = Asset.fromModule(DICT_ASSET_ID);
  await asset.downloadAsync();

  return step("open dictionary worker", () =>
    openDictionary(asset.localUri ?? asset.uri, asset.hash)
  );
}

/**
 * Initializes both databases:
 * - hoshino.db (read-only dictionary, from the bundled asset)
 * - hoshino_user.db (writable user data)
 *
 * Concurrent callers share one attempt. Without this, React's dev-mode double
 * invocation of effects starts the 98MB dictionary download twice, and the
 * abandoned response shows up as "Cannot pipe to a closed or destroyed stream"
 * in the dev server log.
 */
export function getDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = initialise().catch((err) => {
      // Let a later attempt retry rather than caching the failure forever.
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

async function initialise(): Promise<void> {
  if (dictDbInstance && userDbInstance) return;

  const started = Date.now();
  dictDbInstance = await openDictionaryDb();

  const entries = await step("verify dictionary schema", async () => {
    const table = await dictDbInstance!.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name = 'entries_fts'"
    );
    if (!table) {
      throw new Error(
        "entries_fts is missing — the imported database is empty or incomplete"
      );
    }

    // Reading the schema is not enough — the fts5 module also has to run a
    // MATCH, which is exactly what a build lacking FTS5 cannot do.
    await dictDbInstance!.getFirstAsync<{ rowid: number }>(
      "SELECT rowid FROM entries_fts WHERE entries_fts MATCH ? LIMIT 1",
      ["meaning_text : water"]
    );

    const count = await dictDbInstance!.getFirstAsync<{ c: number }>(
      "SELECT COUNT(*) as c FROM entries"
    );
    return count?.c ?? 0;
  });

  userDbInstance = await step("open user db", () =>
    SQLite.openDatabaseAsync("hoshino_user.db")
  );

  await step("create user schema", () =>
    userDbInstance!.execAsync(`
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
      last_review TEXT
    );

    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      jlpt_level INTEGER,
      created_at TEXT NOT NULL
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
      streak_length INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_srs_cards_due ON srs_cards(due);
    CREATE INDEX IF NOT EXISTS idx_srs_cards_entry ON srs_cards(entry_id);
    CREATE INDEX IF NOT EXISTS idx_srs_cards_list ON srs_cards(list_id);
    CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items(list_id);
    CREATE INDEX IF NOT EXISTS idx_list_items_entry ON list_items(entry_id);
  `)
  );

  await step("seed system list", async () => {
    const sysList = await userDbInstance!.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM lists WHERE type = 'system' AND name = 'Searched Terms'"
    );

    if (sysList && sysList.count === 0) {
      await userDbInstance!.runAsync(
        "INSERT INTO lists (name, type, created_at) VALUES ('Searched Terms', 'system', ?)",
        [new Date().toISOString()]
      );
    }
  });

  console.log(
    `?? [DB] ready in ${Date.now() - started}ms — ${entries} dictionary entries`
  );
}

/**
 * Returns the read-only dictionary database connection.
 */
export function getDictDb(): DictionaryDb {
  if (!dictDbInstance) {
    throw new Error("Database not initialized. Call getDatabase() first.");
  }
  return dictDbInstance;
}

/**
 * Returns the writable user database connection.
 */
export function getUserDb(): SQLite.SQLiteDatabase {
  if (!userDbInstance) {
    throw new Error("Database not initialized. Call getDatabase() first.");
  }
  return userDbInstance;
}
