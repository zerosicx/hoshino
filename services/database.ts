import * as SQLite from "expo-sqlite";
import { importDatabaseFromAssetAsync } from "expo-sqlite";
import { Platform } from "react-native";

let dictDbInstance: SQLite.SQLiteDatabase | null = null;
let userDbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * On web, expo-sqlite uses OPFS with a pool of 6 file handles (AccessHandlePoolVFS).
 * Stale handles from previous dev sessions fill the pool and cause SQLITE_CANTOPEN.
 * Clearing the OPFS directory before init frees those handles.
 * See: https://github.com/expo/expo/issues/39903
 */
async function clearWebOPFS(): Promise<void> {
  if (Platform.OS !== "web") return;
  try {
    const root = await navigator.storage.getDirectory();
    for await (const [name] of (root as any).entries()) {
      await root.removeEntry(name, { recursive: true });
    }
  } catch {
    // OPFS not available or already clean
  }
}

/**
 * Initializes both databases:
 * - hoshino.db (read-only dictionary, imported from bundled asset)
 * - hoshino_user.db (writable user data)
 */
export async function getDatabase(): Promise<void> {
  if (dictDbInstance && userDbInstance) return;

  await clearWebOPFS();

  await importDatabaseFromAssetAsync("hoshino.db", {
    assetId: require("../assets/hoshino.db") as number,
    forceOverwrite: true,
  });

  dictDbInstance = await SQLite.openDatabaseAsync("hoshino.db");
  userDbInstance = await SQLite.openDatabaseAsync("hoshino_user.db");

  // 4. Create user schema tables.
  await userDbInstance.execAsync(`
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
  `);

  // 5. Pre-seed the system "Searched Terms" list if it does not exist.
  const sysList = (await userDbInstance.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM lists WHERE type = 'system' AND name = 'Searched Terms'"
  )) as { count: number } | null;

  if (sysList && sysList.count === 0) {
    await userDbInstance.runAsync(
      "INSERT INTO lists (name, type, created_at) VALUES ('Searched Terms', 'system', ?)",
      [new Date().toISOString()]
    );
  }
}

/**
 * Returns the read-only dictionary database connection.
 */
export function getDictDb(): SQLite.SQLiteDatabase {
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
