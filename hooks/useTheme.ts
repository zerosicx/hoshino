import { useEffect } from "react";
import { useColorScheme } from "nativewind";
import { useSettingsStore } from "@/stores/settingsStore";

/**
 * Single source of truth for whether the app is dark.
 *
 * NativeWind resolves `dark:` classes from its own colour scheme, which follows
 * the device unless it is told otherwise. Screens that computed their own
 * `isDark` from the settings store therefore disagreed with every `dark:` class
 * whenever the chosen theme differed from the device, light backgrounds with
 * dark-mode text on top. Pushing the setting into NativeWind and reading the
 * answer back means the two can no longer drift apart.
 */
export function useTheme() {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(themeMode);
  }, [themeMode, setColorScheme]);

  return { isDark: colorScheme === "dark" };
}
