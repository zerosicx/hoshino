import { render } from "@testing-library/react-native";
import { KeyboardAvoidingView, Platform, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import BottomDrawer from "./BottomDrawer";

const insets = { top: 0, right: 0, bottom: 48, left: 0 };

function renderDrawer() {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 400, height: 800 }, insets }}
    >
      <BottomDrawer visible title="New list" onClose={() => {}}>
        <Text>body</Text>
      </BottomDrawer>
    </SafeAreaProvider>
  );
}

describe("BottomDrawer", () => {
  // Under edge-to-edge (SDK 54 default) Android no longer resizes the Modal's
  // window for the keyboard, so the drawer has to pad itself up on both
  // platforms. `undefined` renders a plain View and leaves it hidden.
  it.each(["ios", "android"] as const)(
    "pads for the keyboard on %s",
    (os) => {
      jest.replaceProperty(Platform, "OS", os);
      const { UNSAFE_getByType } = renderDrawer();
      expect(UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe(
        "padding"
      );
    }
  );
});
