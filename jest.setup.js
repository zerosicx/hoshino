/**
 * Shared setup for component tests.
 *
 * Three packages reach for native modules that do not exist under Jest. Each is
 * replaced with the mock its own maintainers ship, rather than a hand-written
 * stand-in that would drift from the real API.
 */

require("react-native-gesture-handler/jestSetup");

// The shipped mock leaves out useReducedMotion, which the flashcard reads.
// Patched at the mock module itself rather than in the factory below, because
// expo-router's testing library registers its own factory for reanimated on
// import and would otherwise replace this one; both factories require the
// mock module, so both see the patch.
jest.mock("react-native-reanimated/mock", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock")
);

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Metro injects the compiled CSS, which carries tailwind.config's
// `darkMode: "class"`. Nothing compiles CSS here, so without this flag
// `useTheme` throws the moment it sets the colour scheme.
require("react-native-css-interop").StyleSheet.registerCompiled({
  flags: { darkMode: "class" },
});
