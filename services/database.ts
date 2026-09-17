import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import { openDictionary } from "./sqliteWasm";

import { BUILT_IN_LISTS, MIGRATIONS, USER_SCHEMA } from "./schema";

const DICT_ASSET_ID = require("../assets/hoshino.db") as number;
const DICT_DB_NAME = "hoshino.db";

/** Which dictionary build the copy on disk came from. */
const DICT_VERSION_KEY = "hoshino.dictionary.version";

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
    throw new Error(`${label}: ${message}`);
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
    if (await needsImport()) {
      await step("import dictionary asset", () =>
        SQLite.importDatabaseFromAssetAsync(DICT_DB_NAME, {
          assetId: DICT_ASSET_ID,
          forceOverwrite: true,
        })
      );
    }

    return step("open dictionary db", () =>
      SQLite.openDatabaseAsync(DICT_DB_NAME)
    );
  }

  const asset = Asset.fromModule(DICT_ASSET_ID);
  await step("resolve dictionary asset", () => asset.downloadAsync());

  return step("open dictionary worker", () =>
    openDictionary(asset.localUri ?? asset.uri, asset.hash)
  );
}

/**
 * The bundled dictionary's identity, or null when it cannot be established.
 *
 * The hash is the asset's MD5, so it changes exactly when the file does.
 */
function dictionaryVersion(): string | null {
  return Asset.fromModule(DICT_ASSET_ID).hash;
}

/**
 * Whether the 98MB asset has to be copied out of the app bundle.
 *
 * It used to be copied on every cold start, which cost seconds of startup and a
 * second 98MB on disk for a file that only changes when the app is updated. The
 * copy now happens on first launch and after a dictionary rebuild.
 *
 * An unidentifiable build copies, because being slow beats running against a
 * stale dictionary.
 */
async function needsImport(): Promise<boolean> {
  const version = dictionaryVersion();
  if (!version) return true;

  return (await AsyncStorage.getItem(DICT_VERSION_KEY)) !== version;
}

/**
 * Records that the copy on disk is good.
 *
 * Deliberately written only after the schema check passes, so a copy that was
 * interrupted or a file that was deleted underneath us is re-imported on the
 * next launch rather than trusted forever.
 */
async function rememberImport(): Promise<void> {
  const version = dictionaryVersion();
  if (Platform.OS === "web" || !version) return;

  await AsyncStorage.setItem(DICT_VERSION_KEY, version);
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
        "entries_fts is missing: the imported database is empty or incomplete"
      );
    }

    // Reading the schema is not enough, the fts5 module also has to run a
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

  await rememberImport();

  userDbInstance = await step("open user db", () =>
    SQLite.openDatabaseAsync("hoshino_user.db")
  );

  await step("create user schema", () =>
    userDbInstance!.execAsync(USER_SCHEMA)
  );

  await step("migrate user schema", async () => {
    for (const migration of MIGRATIONS) {
      const columns = await userDbInstance!.getAllAsync<{ name: string }>(
        `PRAGMA table_info(${migration.table})`
      );
      if (!columns.some((c) => c.name === migration.column)) {
        await userDbInstance!.execAsync(migration.sql);
      }
    }
  });

  await step("seed built-in lists", async () => {
    const now = new Date().toISOString();

    for (const { name, type, level } of BUILT_IN_LISTS) {
      await userDbInstance!.runAsync(
        `INSERT INTO lists (name, type, jlpt_level, created_at)
         SELECT ?, ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM lists WHERE type = ? AND name = ?)`,
        [name, type, level, now, type, name]
      );
    }
  });

  if (__DEV__) {
    console.log(
      `?? [DB] ready in ${Date.now() - started}ms, ${entries} dictionary entries`
    );
  }
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
