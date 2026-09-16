import type { FuriganaPair } from "@/utils/furigana";

/** One piece of a passage as the reader shows it. */
export interface ReaderToken {
  text: string;
  /** The word page this opens, or null for text the dictionary does not know. */
  entryId: number | null;
  furigana: FuriganaPair[];
  /** The user has looked this word up before, here or in search. */
  visited: boolean;
  /** Unknown Japanese the user can still send to search. */
  searchable: boolean;
}
