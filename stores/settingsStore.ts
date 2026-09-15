import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark";
export type ReadingMode = "furigana" | "romaji" | "none";
export type CardFrontMode = "kanji" | "meaning";
/** Follow the device's accessibility setting, or override it either way. */
export type MotionMode = "system" | "reduced" | "full";

export const SESSION_SIZES = [10, 20, 30, 50] as const;

interface SettingsState {
  themeMode: ThemeMode;
  readingMode: ReadingMode;
  cardFrontMode: CardFrontMode;
  /** How many cards make up a study pile. The same every day, backlog or not. */
  sessionSize: number;
  motionMode: MotionMode;

  setThemeMode: (mode: ThemeMode) => void;
  setReadingMode: (mode: ReadingMode) => void;
  setCardFrontMode: (mode: CardFrontMode) => void;
  setSessionSize: (size: number) => void;
  setMotionMode: (mode: MotionMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: "system",
      readingMode: "furigana",
      cardFrontMode: "kanji",
      sessionSize: 20,
      motionMode: "system",

      setThemeMode: (themeMode) => set({ themeMode }),
      setReadingMode: (readingMode) => set({ readingMode }),
      setCardFrontMode: (cardFrontMode) => set({ cardFrontMode }),
      setSessionSize: (sessionSize) => set({ sessionSize }),
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
        motionMode: s.motionMode,
      }),
    }
  )
);
