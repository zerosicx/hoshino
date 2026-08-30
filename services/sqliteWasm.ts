/**
 * Native stub. The real implementation lives in sqliteWasm.web.ts.
 *
 * Native builds of expo-sqlite compile FTS5 in — see the SQLITE_ENABLE_FTS5 flag
 * in expo-sqlite/android/build.gradle — so they read the bundled dictionary
 * directly and need no WebAssembly fallback.
 */

export async function openDictionary(
  _assetUri: string,
  _assetHash: string | null
): Promise<never> {
  throw new Error("sqlite-wasm is web-only; native opens the asset directly");
}
