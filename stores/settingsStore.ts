import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark";
export type ReadingMode = "furigana" | "romaji" | "none";
export type CardFrontMode = "kanji" | "meaning";
/** Follow the device's accessibility setting, or override it either way. */
export type MotionMode = "system" | "reduced" | "full";

export const SESSION_SIZES = [10, 20, 30, 50] as const;
export const NEW_PER_DAY_OPTIONS = [5, 10, 15, 20] as const;

interface SettingsState {
  themeMode: ThemeMode;
  readingMode: ReadingMode;
  cardFrontMode: CardFrontMode;
  /** The most distinct cards one session shows. Re-shows do not count. */
  sessionSize: number;
  /** Never-seen words that may be introduced in a day, across every list. */
  newPerDay: number;
  motionMode: MotionMode;

  setThemeMode: (mode: ThemeMode) => void;
  setReadingMode: (mode: ReadingMode) => void;
  setCardFrontMode: (mode: CardFrontMode) => void;
  setSessionSize: (size: number) => void;
  setNewPerDay: (count: number) => void;
  setMotionMode: (mode: MotionMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: "system",
      readingMode: "furigana",
      cardFrontMode: "kanji",
      sessionSize: 20,
      newPerDay: 10,
      motionMode: "system",

      setThemeMode: (themeMode) => set({ themeMode }),
      setReadingMode: (readingMode) => set({ readingMode }),
      setCardFrontMode: (cardFrontMode) => set({ cardFrontMode }),
      setSessionSize: (sessionSize) => set({ sessionSize }),
      setNewPerDay: (newPerDay) => set({ newPerDay }),
      setMotionMode: (motionMode) => set({ motionMode }),
    }),
    {
      name: "hoshino-settings",
      storage: createJSONStorage(() => AsyncStorage),
      // Only the values are saved; the setters come from the store itself.
      partialize: (s) => ({
        themeMode: s.themeMode,
        readingMode: s.readingMode,
        cardFrontMode: s.cardFrontMode,
        sessionSize: s.sessionSize,
        newPerDay: s.newPerDay,
        motionMode: s.motionMode,
      }),
    }
  )
);
