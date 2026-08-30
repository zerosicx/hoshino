/**
 * Metro stub for the official sqlite-wasm package's worker entry points.
 *
 * The package locates its worker scripts with `new URL(name, import.meta.url)`.
 * Metro rewrites those into bare module specifiers it cannot resolve, which
 * fails the web bundle. We use the main-thread oo1 API, so neither script is
 * needed:
 *
 *  - sqlite3-worker1.mjs is a deprecated API and a full 558KB duplicate of the
 *    sqlite3 module, so bundling it would roughly double the web bundle.
 *  - sqlite3-opfs-async-proxy.js only serves the async `opfs` VFS. The bundled
 *    dictionary is read-only and is loaded into the WASM filesystem instead.
 *
 * If we later add OPFS persistence, the SQLite SAH pool VFS is synchronous and
 * needs no async proxy, so this stub stays valid.
 */

module.exports = {};
