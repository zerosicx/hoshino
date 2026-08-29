const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("db", "wasm");
config.resolver.blockList = [
  new RegExp(`^${__dirname}/scripts/.*`),
  new RegExp(`^${__dirname}/scratch/.*`),
];
// Add wasm to the source extensions
config.resolver.sourceExts.push('wasm');

module.exports = withNativeWind(config, {
  input: "./global.css",
  inlineRem: 16,
});
