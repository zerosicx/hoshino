import type { ComponentProps } from "react";
import { Platform } from "react-native";
import type { Stack } from "expo-router";

type StackOptions = ComponentProps<typeof Stack>["screenOptions"];
type StackAnimation = "default" | "slide_from_right";

/**
 * Android's default stack animation is the short system activity transition,
 * which exposes the incoming screen's first paint, so it gets a deliberate
 * slide. iOS already slides natively; naming the animation there would swap
 * UIKit's transition for react-native-screens' custom animator, which drops the
 * popped screen's content and shows a blank page as it slides out.
 */
export function stackAnimation(os: typeof Platform.OS): StackAnimation {
  return os === "android" ? "slide_from_right" : "default";
}

/** Shared by every stack. Screens draw their own headers. */
export const stackScreenOptions: StackOptions = {
  headerShown: false,
  animation: stackAnimation(Platform.OS),
};
