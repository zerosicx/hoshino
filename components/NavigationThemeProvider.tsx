import type { PropsWithChildren } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useTheme } from "@/hooks/useTheme";

/**
 * Gives every navigator the app's own surface colours.
 *
 * Expo Router falls back to React Navigation's light theme, so each stack and
 * tab scene was painted #F2F2F2 underneath the screen, visible as a flash on
 * every transition until the screen's own background landed, and glaring in
 * dark mode.
 */
const light = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#4F46E5",
    background: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E4E4E7",
  },
};

const dark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#6366F1",
    background: "#09090B",
    card: "#09090B",
    border: "#27272A",
  },
};

export default function NavigationThemeProvider({ children }: PropsWithChildren) {
  const { isDark } = useTheme();
  return <ThemeProvider value={isDark ? dark : light}>{children}</ThemeProvider>;
}
