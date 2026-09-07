/**
 * Component tests only.
 *
 * Vitest owns `*.test.ts` — the pure functions and the SQL suites, which run in
 * Node against better-sqlite3 and finish in about a second. Rendering a
 * component needs React Native's own transform pipeline instead, which is what
 * jest-expo provides, so those tests are `*.test.tsx` and run here. Splitting by
 * extension means neither runner can pick up the other's files.
 */

const { transform, transformIgnorePatterns } = require("jest-expo/jest-preset");

// jest-expo's Babel rule matches `.js`/`.ts` only; lucide ships `.mjs`.
const { ["\\.[jt]sx?$"]: babel, ...otherTransforms } = transform;

/**
 * Packages shipped as untranspiled source, which Babel therefore has to see.
 *
 * jest-expo's own list covers React Native and Expo but stops there. NativeWind
 * and its `react-native-css-interop` runtime are what every `className` in this
 * app resolves through, and the icon and SVG packages are imported by nearly
 * every screen.
 */
const UNTRANSPILED = [
  "nativewind",
  "react-native-css-interop",
  "lucide-react-native",
  "react-native-svg",
  "react-native-reanimated",
  "react-native-gesture-handler",
  "react-native-worklets",
];

module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/*.test.tsx"],
  transform: { ...otherTransforms, "\\.m?[jt]sx?$": babel },
  transformIgnorePatterns: [
    transformIgnorePatterns[0].replace(
      "|native-base))",
      `|native-base|${UNTRANSPILED.join("|")}))`
    ),
    ...transformIgnorePatterns.slice(1),
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@components/(.*)$": "<rootDir>/components/$1",
    "^@services/(.*)$": "<rootDir>/services/$1",
    "^@hooks/(.*)$": "<rootDir>/hooks/$1",
    "^@stores/(.*)$": "<rootDir>/stores/$1",
    "^@utils/(.*)$": "<rootDir>/utils/$1",
    "^@assets/(.*)$": "<rootDir>/assets/$1",
  },
};
