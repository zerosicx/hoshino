import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark";
export type ReadingMode = "furigana" | "romaji" | "none";
export type CardFrontMode = "kanji" | "meaning";

interface SettingsState {
  themeMode: ThemeMode;
  readingMode: ReadingMode;
  cardFrontMode: CardFrontMode;
  dailyNewCards: number;

  setThemeMode: (mode: ThemeMode) => void;
  setReadingMode: (mode: ReadingMode) => void;
  setCardFrontMode: (mode: CardFrontMode) => void;
  setDailyNewCards: (count: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: "system",
      readingMode: "furigana",
      cardFrontMode: "kanji",
      dailyNewCards: 20,

      setThemeMode: (themeMode) => set({ themeMode }),
      setReadingMode: (readingMode) => set({ readingMode }),
      setCardFrontMode: (cardFrontMode) => set({ cardFrontMode }),
      setDailyNewCards: (dailyNewCards) => set({ dailyNewCards }),
    }),
    {
      name: "hoshino-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
