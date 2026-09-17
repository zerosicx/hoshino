import { Linking, Text } from "react-native";
import { renderRouter, screen, act, fireEvent } from "expo-router/testing-library";
import * as SettingsLayout from "@/app/(tabs)/settings/_layout";
import SettingsScreen from "@/app/(tabs)/settings/index";
import AboutScreen from "@/app/(tabs)/settings/about";
import { ATTRIBUTIONS, PRIVACY_POLICY_URL } from "@/constants/attributions";

const routes = {
  "(tabs)/settings/_layout": SettingsLayout,
  "(tabs)/settings/index": SettingsScreen,
  "(tabs)/settings/about": AboutScreen,
  "(tabs)/dictionary/index": () => <Text>dictionary</Text>,
};

describe("About and sources", () => {
  it("is reached from Settings, on a screen of its own", async () => {
    renderRouter(routes, { initialUrl: "/settings" });
    await act(async () => {});
    await act(async () => fireEvent.press(screen.getByLabelText("About and sources")));
    expect(screen).toHavePathname("/settings/about");
  });

  it("acknowledges every source with its licence, and carries the privacy policy", async () => {
    renderRouter(routes, { initialUrl: "/settings/about" });
    await act(async () => {});

    for (const a of ATTRIBUTIONS) {
      expect(screen.getByText(a.name)).toBeTruthy();
      // Two sources share a licence, so more than one match is fine.
      expect(screen.getAllByText(a.licence).length).toBeGreaterThan(0);
    }
    // The EDRDG's own wording, on this screen, is what the licence requires.
    expect(screen.getByText(/Electronic Dictionary Research and Development Group, and are used in conformance/)).toBeTruthy();
    expect(screen.getByText(/does not collect, store or share any personal data/)).toBeTruthy();
  });

  it("opens the online policy", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    renderRouter(routes, { initialUrl: "/settings/about" });
    await act(async () => {});
    fireEvent.press(screen.getByLabelText("Privacy policy online"));
    expect(open).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
    open.mockRestore();
  });
});
