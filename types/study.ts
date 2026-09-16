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

/**
 * What a session is made of. Mixed: due cards, then new words up to today's
 * remaining budget. Review: due cards only. Learn: new words past the budget,
 * for the learner who has finished and wants to go on.
 */
export type SessionMode = "mixed" | "review" | "learn";

/**
 * How far a list has come, for the Study landing and the list page. The five
 * buckets are the mastery ladder (`stageOf` in `services/scheduler.ts`);
 * counts exclude suspended words, which are listed apart.
 */
export interface ListProgress {
  listId: number;
  total: number;
  newCount: number;
  learning: number;
  familiar: number;
  known: number;
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
  again: number;
  hard: number;
  easy: number;
  /** New words shown for the first time. */
  introduced: number;
  /** Words that graduated to Review for the first time. */
  learned: number;
  sessions: number;
}

/** The three numbers in the Study landing's banner. */
export interface StudyStats {
  streak: number;
  learnedToday: number;
  reviewedToday: number;
}

/** What a flashcard shows: the entry and the examples behind it. */
export interface CardContent {
  entry: DictionaryEntry;
  examples: ExampleSentence[];
}
