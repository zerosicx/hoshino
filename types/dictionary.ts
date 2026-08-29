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
  conjugationClass: string | null;
  tags: string[];
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
