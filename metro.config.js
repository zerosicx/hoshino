const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("db", "wasm");
config.resolver.blockList = [
  new RegExp(`^${__dirname}/scripts/.*`),
  new RegExp(`^${__dirname}/scratch/.*`),
];

// See metro/sqliteWasmWorkerStub.js for why these are stubbed.
const SQLITE_WASM_WORKER_STUB = path.join(
  __dirname,
  "metro/sqliteWasmWorkerStub.js"
);
const SQLITE_WASM_WORKER_SCRIPTS = new Set([
  "sqlite3-worker1.mjs",
  "sqlite3-opfs-async-proxy.js",
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (SQLITE_WASM_WORKER_SCRIPTS.has(moduleName)) {
    return { type: "sourceFile", filePath: SQLITE_WASM_WORKER_STUB };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// expo-sqlite's web build backs the user database with a worker that needs
// SharedArrayBuffer, which browsers only expose to cross-origin isolated pages.
// Production hosting needs these same two headers.
// Spread the defaults: Expo puts rewriteRequestUrl, port and unstable_serverRoot
// here, and serverRoot is what worker bundle URLs are resolved against.
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      middleware(req, res, next);
    };
  },
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  inlineRem: 16,
});
