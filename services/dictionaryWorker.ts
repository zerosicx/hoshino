/**
 * Hosts the read-only dictionary inside a dedicated worker. Web only — spawned
 * by sqliteWasm.web.ts, never imported directly.
 *
 * The dictionary lives here rather than on the main thread for two reasons.
 *
 * OPFS is the first. Persisting the 98MB file means reading it through an OPFS
 * VFS, which is built on FileSystemFileHandle.createSyncAccessHandle(), and the
 * spec only exposes that inside a dedicated worker — on the main thread it
 * throws. Reading through a VFS also keeps the file out of the WASM heap
 * entirely, since SQLite pages in only what a query touches.
 *
 * Query latency is the second. FTS5 searches are synchronous once SQLite has
 * the bytes, so running them here keeps typing in the search box smooth.
 */

import sqlite3InitModule, {
  type Database,
  type SAHPoolUtil,
  type Sqlite3Static,
} from "@sqlite.org/sqlite-wasm";

/**
 * Our OPFS pool, kept apart from the one expo-sqlite creates for the user
 * database. Two pools may never share a directory.
 */
const POOL_NAME = "hoshino-dictionary";
const POOL_DIRECTORY = "/hoshino-dictionary";

/** The dictionary, plus room for temp files an FTS5 query may spill to. */
const POOL_CAPACITY = 4;

const SQLITE_MAGIC = "SQLite format 3";

type OpenPayload = {
  type: "open";
  wasmUri: string;
  assetUri: string;
  /** The asset's MD5, when the bundler knows it. Absent in web dev builds. */
  assetHash: string | null;
};

type QueryPayload = {
  type: "all" | "first";
  sql: string;
  params: (string | number | null)[];
};

/** What a caller sends. The id is added by the main-thread proxy. */
export type DictionaryPayload = OpenPayload | QueryPayload;

export type DictionaryRequest = DictionaryPayload & { id: number };

export type DictionaryResponse =
  | { id: number; ok: true; rows: unknown[] }
  | { id: number; ok: false; error: string };

/**
 * The published types declare init() as taking no arguments, but at runtime it
 * forwards its first argument to Emscripten, whose locateFile() checks
 * Module.locateFile before falling back to a package-relative URL. Metro serves
 * the .wasm as a hashed bundle asset, so we have to point at that URL instead.
 */
type InitOptions = {
  locateFile?: (path: string) => string;
  printErr?: (message: string) => void;
};

const init = sqlite3InitModule as unknown as (
  options?: InitOptions
) => Promise<Sqlite3Static>;

// babel-preset-expo rewrites every `import.meta.url` to a lookup on this global,
// including the ones inside sqlite-wasm. Expo installs it from the app entry's
// polyfills, which a worker bundle never runs, so reading it here throws unless
// we provide it. The value is inert: sqlite-wasm only stores it, since the two
// paths that would resolve against it — its default wasm lookup and its own
// worker spawning — are overridden by locateFile and stubbed in metro.config.js.
const importMetaRegistry = globalThis as {
  __ExpoImportMetaRegistry?: { url: string };
};
importMetaRegistry.__ExpoImportMetaRegistry ??= { url: self.location.href };

let db: Database | null = null;

// Worker globals, reached through casts because this file is typechecked with
// the DOM lib rather than webworker.
const post = (message: DictionaryResponse): void =>
  (self as unknown as { postMessage: (m: DictionaryResponse) => void }).postMessage(
    message
  );

addEventListener("message", (event) => {
  void handle((event as MessageEvent<DictionaryRequest>).data);
});

async function handle(request: DictionaryRequest): Promise<void> {
  try {
    if (request.type === "open") {
      await open(request);
      post({ id: request.id, ok: true, rows: [] });
      return;
    }

    if (!db) {
      throw new Error("dictionary is not open");
    }

    const rows = db.exec({
      sql: request.sql,
      bind: request.params,
      rowMode: "object",
      returnValue: "resultRows",
    }) as unknown[];

    post({
      id: request.id,
      ok: true,
      rows: request.type === "first" ? rows.slice(0, 1) : rows,
    });
  } catch (err) {
    post({
      id: request.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function open({
  wasmUri,
  assetUri,
  assetHash,
}: OpenPayload): Promise<void> {
  const sqlite3 = await init({
    locateFile: () => wasmUri,
    printErr: (message) => console.error("?? [DICT]", message),
  });
  console.log(
    `?? [DICT] sqlite ${sqlite3.version.libVersion} ready in worker, ` +
      `vfs: ${sqlite3.capi.sqlite3_js_vfs_list().join(", ")}`
  );

  const cacheKey = resolveCacheKey(assetUri, assetHash);
  if (cacheKey) {
    const pool = await installPool(sqlite3);
    if (pool) {
      db = await openFromPool(pool, `/${cacheKey}.db`, assetUri);
      return;
    }
  }

  db = openInMemory(sqlite3, await download(assetUri));
}

/**
 * Names the cached copy after something that changes when the dictionary does,
 * so rebuilding it evicts the stale copy instead of serving it forever.
 *
 * Every source here is read from strings the bundler already handed us. An
 * earlier version asked the dev server for Content-Length over HEAD, which cost
 * a round trip and tripped a bug in expo-server: it builds a response body for
 * HEAD as well as GET, then pipes it into a socket Node has already ended,
 * logging "Cannot pipe to a closed or destroyed stream" on every web reload.
 */
function resolveCacheKey(
  assetUri: string,
  assetHash: string | null
): string | null {
  const hash = assetHash ?? readHashFromUri(assetUri);
  if (hash) return `hoshino-${hash}`;

  // Caching still beats a 98MB download per reload, but this build cannot be
  // told apart from the last one, so a rebuild has to be evicted by hand.
  console.warn(
    "?? [DICT] no content hash on this build — caching under a fixed name. " +
      "After rebuilding the dictionary, clear DevTools > Application > " +
      `Storage > ${POOL_DIRECTORY} or the stale copy will be served.`
  );
  return "hoshino-unidentified";
}

/**
 * Digs the asset's MD5 out of its URL.
 *
 * Metro puts it in a query parameter when serving from the dev server, and in
 * the filename when exporting, so one of the two forms is present wherever the
 * `Asset` object itself does not carry the hash.
 */
function readHashFromUri(assetUri: string): string | null {
  const query = /[?&]hash=([0-9a-f]{8,})/i.exec(assetUri);
  if (query) return query[1];

  const filename = /\.([0-9a-f]{32})\.[a-z0-9]+(?:$|[?#])/i.exec(assetUri);
  return filename ? filename[1] : null;
}

/**
 * Installs the pool, or returns null if this browser or tab cannot have one.
 *
 * A pool needs exclusive access handles on its files, so a second tab of the
 * app will fail here. Falling back to a memory database keeps that tab working,
 * at the cost of holding the dictionary in the heap.
 */
async function installPool(
  sqlite3: Sqlite3Static
): Promise<SAHPoolUtil | null> {
  try {
    return await sqlite3.installOpfsSAHPoolVfs({
      name: POOL_NAME,
      directory: POOL_DIRECTORY,
      initialCapacity: POOL_CAPACITY,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `?? [DICT] OPFS unavailable (${message}); falling back to an in-memory copy`
    );
    return null;
  }
}

/**
 * Serves the dictionary from OPFS, importing it first if this build is not
 * cached yet.
 */
async function openFromPool(
  pool: SAHPoolUtil,
  fileName: string,
  assetUri: string
): Promise<Database> {
  if (pool.getFileNames().includes(fileName)) {
    console.log(`?? [DICT] served from OPFS cache ${fileName}`);
  } else {
    // Anything already in this pool is a dictionary from an earlier build.
    for (const stale of pool.getFileNames()) {
      console.log(`?? [DICT] evicting outdated dictionary ${stale}`);
      pool.unlink(stale);
    }

    const written = await pool.importDb(fileName, await download(assetUri));
    console.log(
      `?? [DICT] cached ${toMegabytes(written)} in OPFS as ${fileName}`
    );
  }

  return new pool.OpfsSAHPoolDb(fileName);
}

/**
 * Loads the dictionary image into a memory database.
 *
 * Writing the image to the WASM filesystem and opening it by path does not work
 * here: sqlite3_open_v2 never touches the file, so a path the default VFS cannot
 * reach only fails on the first query, as an opaque SQLITE_CANTOPEN. Handing the
 * bytes straight to sqlite3_deserialize keeps the filesystem out of it entirely.
 */
function openInMemory(sqlite3: Sqlite3Static, bytes: Uint8Array): Database {
  const { capi, oo1, wasm } = sqlite3;
  const db = new oo1.DB(":memory:");

  // FREEONCLOSE hands ownership of this allocation to SQLite, so it must not be
  // freed here.
  const image = wasm.allocFromTypedArray(bytes);
  db.checkRc(
    capi.sqlite3_deserialize(
      db.pointer!,
      "main",
      image,
      bytes.byteLength,
      bytes.byteLength,
      capi.SQLITE_DESERIALIZE_READONLY | capi.SQLITE_DESERIALIZE_FREEONCLOSE
    )
  );

  console.log(`?? [DICT] loaded ${toMegabytes(bytes.byteLength)} into memory`);
  return db;
}

async function download(assetUri: string): Promise<Uint8Array> {
  const started = Date.now();
  const response = await fetch(assetUri);
  if (!response.ok) {
    throw new Error(`dictionary request returned ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  assertPortableSqliteImage(bytes);
  console.log(
    `?? [DICT] downloaded ${toMegabytes(bytes.byteLength)} in ${Date.now() - started}ms`
  );
  return bytes;
}

/**
 * Rejects a dictionary image the browser cannot open, while we still have a
 * clear place to say why.
 */
function assertPortableSqliteImage(bytes: Uint8Array): void {
  const magic = new TextDecoder().decode(bytes.slice(0, 15));
  if (magic !== SQLITE_MAGIC) {
    throw new Error(
      `not a SQLite database: expected "${SQLITE_MAGIC}", got "${magic}" (${bytes.byteLength} bytes)`
    );
  }

  // Byte 18 is the file format write version: 1 is a rollback journal, 2 is WAL.
  // WAL needs a real file plus shared memory, which no browser VFS provides, so
  // SQLite fails with SQLITE_CANTOPEN when it reads the schema — long after the
  // open call appears to have succeeded, since SQLite opens files lazily.
  if (bytes[18] === 2) {
    throw new Error(
      "dictionary is in WAL mode, which cannot be opened on web. Rebuild it, " +
        'or convert it with: sqlite3 assets/hoshino.db "PRAGMA journal_mode=DELETE;"'
    );
  }
}

function toMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
