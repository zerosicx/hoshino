import type { ComponentProps } from "react";
import type { Stack } from "expo-router";

/**
 * Shared by every stack. Screens draw their own headers, and the push slides
 * in from the right on both platforms: Android's default is the system
 * activity transition, short enough to expose the incoming screen's first paint.
 */
export const stackScreenOptions: ComponentProps<typeof Stack>["screenOptions"] = {
  headerShown: false,
  animation: "slide_from_right",
};
