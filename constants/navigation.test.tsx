// Pure logic, but the module reads react-native's Platform, which only the
// Jest half can load — hence the .tsx extension that routes it there.
import { stackAnimation } from "./navigation";

describe("stack animation", () => {
  it("slides from the right on Android, whose system default exposes the first paint", () => {
    expect(stackAnimation("android")).toBe("slide_from_right");
  });

  // iOS already slides from the right natively. Asking for it by name swaps
  // UIKit's transition for react-native-screens' custom animator, which loses
  // the popped screen's content and shows a blank page during the slide-out.
  it("keeps the native transition on iOS", () => {
    expect(stackAnimation("ios")).toBe("default");
  });

  it("keeps the native transition on web", () => {
    expect(stackAnimation("web")).toBe("default");
  });
});
