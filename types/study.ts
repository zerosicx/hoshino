import type { Card } from "ts-fsrs";
import type { DictionaryEntry, ExampleSentence } from "./dictionary";
import type { ListSummary } from "./lists";

/** One word in one list, with its scheduling state if it has ever been rated. */
export interface StudyCard {
  entryId: number;
  listId: number;
  /** Null until the first rating: a word in a list is "new" by having no card. */
  card: Card | null;
  suspended: boolean;
}

/** How far a list has come, for the Study landing. Counts exclude suspended. */
export interface ListProgress {
  listId: number;
  total: number;
  newCount: number;
  learning: number;
  review: number;
  mastered: number;
  due: number;
  suspended: number;
}

export interface ActiveList {
  list: ListSummary;
  progress: ListProgress;
}

/** One day's row from `study_stats`. */
export interface DailyStats {
  date: string;
  reviewed: number;
  correct: number;
  again: number;
  hard: number;
  easy: number;
  sessions: number;
}

export interface StudyStats {
  streak: number;
  /** Good + Easy as a share of today's reviews, or null before any review. */
  accuracy: number | null;
  reviewedToday: number;
}

/** What a flashcard shows: the entry and the examples behind it. */
export interface CardContent {
  entry: DictionaryEntry;
  examples: ExampleSentence[];
}
