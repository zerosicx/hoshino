import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Longer than any article worth pasting, short enough that segmenting it
 * paragraph by paragraph stays quick. Anything past it is dropped, with a
 * toast saying so.
 */
export const MAX_READER_CHARS = 20_000;

interface ReaderState {
  /** The text being read, kept so a long article survives leaving and relaunching. */
  text: string;
  setText: (text: string) => void;
  clear: () => void;
}

/**
 * Only the text is stored, never the segmentation: it is recomputed from the
 * dictionary, which is the single source of truth for what a word is. Kept
 * out of the user database on purpose, it is not synced, has no query, and a
 * pasted passage may be someone else's writing.
 */
export const useReaderStore = create<ReaderState>()(
  persist(
    (set) => ({
      text: "",
      setText: (text) => set({ text: [...text].slice(0, MAX_READER_CHARS).join("") }),
      clear: () => set({ text: "" }),
    }),
    {
      name: "hoshino-reader",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ text: s.text }),
    }
  )
);
