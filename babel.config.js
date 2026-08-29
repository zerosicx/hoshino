module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          web: { unstable_transformImportMeta: true },
        },
      ],
    ],
    plugins: [
      // react-native-reanimated must be last
      "react-native-reanimated/plugin",
    ],
  };
};
