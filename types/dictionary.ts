import type { FuriganaPair } from "@/utils/furigana";
import type { WordClassInfo } from "@/utils/wordClass";

export interface Sense {
  glosses: string[];
  pos: string[];
  misc: string[];
  info: string[];
}

export interface DictionaryEntry {
  id: number;
  kanjiForms: string[];
  readingForms: string[];
  senses: Sense[];
  jlptLevel: number | null;
  isCommon: boolean;
  tags: string[];
  /** Derived from the part-of-speech tags on `senses`, not from a column. */
  wordClass: WordClassInfo | null;
}

export interface KanjiEntry {
  character: string;
  meanings: string[];
  onReadings: string[];
  kunReadings: string[];
  jlptLevel: number | null;
  grade: number | null;
  strokeCount: number | null;
  radicals: string[];
  frequency: number | null;
}

export interface ExampleToken {
  surface: string;
  reading: string;
  entryId: number | null;
}

export interface ExampleSentence {
  id: number;
  japanese: string;
  english: string;
  tokens: ExampleToken[];
  /** The sentence split for display, with readings over the kanji it knows. */
  furigana: FuriganaPair[];
}

export interface SearchResult {
  id: number;
  kanjiForm: string;
  readingForm: string;
  primaryMeaning: string;
  jlptLevel: number | null;
  isCommon: boolean;
  pos: string[];
}
