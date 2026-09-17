/**
 * Serves the read-only dictionary from the official SQLite WebAssembly build,
 * running in a dedicated worker. Web only.
 *
 * expo-sqlite's own WASM build omits FTS5, its compile options list just
 * ENABLE_BATCH_ATOMIC_WRITE, ENABLE_PREUPDATE_HOOK and ENABLE_SESSION, and the
 * binary contains no fts5 symbols at all. A build without that module cannot
 * read a schema declaring `CREATE VIRTUAL TABLE ... USING fts5`, which is why
 * the dictionary failed to open on web regardless of file size, OPFS state or
 * available memory. Native builds are unaffected: expo-sqlite compiles FTS5 in
 * via SQLITE_ENABLE_FTS5.
 *
 * The official build ships FTS5 plus the unicode61, trigram, porter and ascii
 * tokenizers, so our schema and queries work unchanged.
 *
 * This file is only the main-thread half. See dictionaryWorker.ts for why the
 * database itself lives in a worker.
 */

import { Asset } from "expo-asset";
import type {
  DictionaryPayload,
  DictionaryRequest,
  DictionaryResponse,
} from "./dictionaryWorker";

type Pending = {
  resolve: (rows: unknown[]) => void;
  reject: (error: Error) => void;
};

/**
 * Talks to the worker, exposing the same async shape the service layer already
 * uses so dictionary queries are identical on both platforms.
 */
class WorkerDictionaryDb {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  constructor(private readonly worker: Worker) {
    worker.addEventListener("message", (event: MessageEvent) => {
      this.settle(event.data as DictionaryResponse);
    });

    // An uncaught worker failure would otherwise leave every caller hanging.
    worker.addEventListener("error", (event: ErrorEvent) => {
      this.rejectAll(new Error(event.message || "dictionary worker crashed"));
    });
  }

  async getAllAsync<T>(
    source: string,
    params: (string | number | null)[] = []
  ): Promise<T[]> {
    const rows = await this.send({ type: "all", sql: source, params });
    return rows as T[];
  }

  async getFirstAsync<T>(
    source: string,
    params: (string | number | null)[] = []
  ): Promise<T | null> {
    const rows = await this.send({ type: "first", sql: source, params });
    return rows.length > 0 ? (rows[0] as T) : null;
  }

  send(payload: DictionaryPayload): Promise<unknown[]> {
    const id = this.nextId++;
    return new Promise<unknown[]>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...payload, id } satisfies DictionaryRequest);
    });
  }

  private settle(response: DictionaryResponse): void {
    const pending = this.pending.get(response.id);
    if (!pending) return;
    this.pending.delete(response.id);

    if (response.ok) {
      pending.resolve(response.rows);
    } else {
      pending.reject(new Error(response.error));
    }
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}

/**
 * Opens the dictionary in a worker, which caches it in OPFS keyed by build.
 */
export async function openDictionary(
  assetUri: string,
  assetHash: string | null
): Promise<WorkerDictionaryDb> {
  const wasmUri = await resolveWasmUri();

  // Two constraints on this line. The path has to be a string literal, because
  // Expo detects this exact shape to emit dictionaryWorker.ts as its own worker
  // bundle and rewrites the path to the real bundle URL. And the base has to be
  // location.href rather than import.meta.url: babel-preset-expo rewrites
  // import.meta.url to a lookup backed by document.currentScript, which is null
  // outside synchronous script evaluation, so constructing the URL from an async
  // caller throws "Invalid base URL". expo-sqlite spawns its own worker the same
  // way for the same reason.
  const worker = new Worker(
    new URL("./dictionaryWorker", window.location.href)
  );

  const db = new WorkerDictionaryDb(worker);
  await db.send({ type: "open", wasmUri, assetUri, assetHash });
  return db;
}

async function resolveWasmUri(): Promise<string> {
  // Required lazily so static web rendering never resolves it on the server.
  const assetId = require("@sqlite.org/sqlite-wasm/sqlite3.wasm") as number;
  const asset = Asset.fromModule(assetId);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}
