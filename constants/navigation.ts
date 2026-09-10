import type { ComponentProps } from "react";
import { Platform } from "react-native";
import type { Stack } from "expo-router";

type StackOptions = ComponentProps<typeof Stack>["screenOptions"];
type ScreenOptions = ComponentProps<typeof Stack.Screen>["options"];
type StackAnimation = "default" | "slide_from_right";

/**
 * Android's default stack animation is the short system activity transition,
 * which exposes the incoming screen's first paint, so it gets a deliberate
 * slide. iOS already slides natively; naming the animation there would swap
 * UIKit's transition (and its interactive swipe-back) for react-native-screens'
 * custom animator for no gain.
 */
export function stackAnimation(os: typeof Platform.OS): StackAnimation {
  return os === "android" ? "slide_from_right" : "default";
}

/** Shared by every stack. Screens draw their own headers. */
export const stackScreenOptions: StackOptions = {
  headerShown: false,
  animation: stackAnimation(Platform.OS),
};

/**
 * A screen that floats over whichever screen pushed it, which stays visible
 * underneath. Used for dialogs: a real screen in the main window, so the
 * keyboard, autofocus and hardware back all behave as they do everywhere else.
 */
export const dialogScreenOptions: ScreenOptions = {
  headerShown: false,
  presentation: "transparentModal",
  animation: "fade",
};
