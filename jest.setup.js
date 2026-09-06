/**
 * Shared setup for component tests.
 *
 * Three packages reach for native modules that do not exist under Jest. Each is
 * replaced with the mock its own maintainers ship, rather than a hand-written
 * stand-in that would drift from the real API.
 */

require("react-native-gesture-handler/jestSetup");

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock")
);

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
