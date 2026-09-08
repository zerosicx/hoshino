export type ListType = "system" | "custom" | "jlpt_vocab" | "jlpt_kanji";

export interface ListSummary {
  id: number;
  name: string;
  type: ListType;
  jlptLevel: number | null;
  starred: boolean;
  itemCount: number;
  /** Newest item's timestamp, or the creation date for an empty list. */
  lastActivity: string;
}

/** Words and kanji per JLPT level, keyed by level (5 = N5). */
export interface JlptCounts {
  vocab: Record<number, number>;
  kanji: Record<number, number>;
}
