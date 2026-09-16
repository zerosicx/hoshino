/**
 * Daily study statistics: the streak, today's new words and today's reviews.
 *
 * One row per local day in `study_stats`. The streak is derived from those
 * rows at read time rather than cached in `streak_length`, so it cannot
 * disagree with the days it is derived from.
 */

import { getUserDb } from "./database";
import { Rating, State, type Grade } from "./scheduler";
import {
  NEW_TODAY_SQL,
  RECORD_REVIEW_SQL,
  RECORD_SESSION_SQL,
  STATS_FOR_DAY_SQL,
  STUDY_DAYS_SQL,
  dayKey,
  reviewDeltaParams,
  streakFrom,
  toDailyStats,
  type StatsRow,
} from "./studyQuery";
import type { Card } from "ts-fsrs";
import type { DailyStats, StudyStats } from "@/types/study";

/**
 * Counts one rating against today, with what it did to the card: an
 * introduction when the word had never been rated, a graduation when it
 * reached Review for the first time. A lapsed word returning to Review is
 * not "learned" again. Called inside `rateCard`'s transaction.
 */
export async function recordReview(
  rating: Grade,
  before: Card | null,
  after: Card,
  now = new Date()
): Promise<void> {
  const wasNew = !before || before.state === State.New;
  const graduated =
    after.state === State.Review && (wasNew || before!.state === State.Learning);
  await getUserDb().runAsync(
    RECORD_REVIEW_SQL,
    reviewDeltaParams(dayKey(now), {
      again: rating === Rating.Again ? 1 : 0,
      hard: rating === Rating.Hard ? 1 : 0,
      easy: rating === Rating.Easy ? 1 : 0,
      introduced: wasNew ? 1 : 0,
      learned: graduated ? 1 : 0,
    })
  );
}

export async function recordSessionStart(now = new Date()): Promise<void> {
  await getUserDb().runAsync(RECORD_SESSION_SQL, [dayKey(now)]);
}

export async function getDayStats(now = new Date()): Promise<DailyStats | null> {
  const row = await getUserDb().getFirstAsync<StatsRow>(STATS_FOR_DAY_SQL, [dayKey(now)]);
  return row ? toDailyStats(row) : null;
}

/** New words introduced so far today, spent against `newPerDay`. */
export async function getNewToday(now = new Date()): Promise<number> {
  const row = await getUserDb().getFirstAsync<{ n: number }>(NEW_TODAY_SQL, [dayKey(now)]);
  return row?.n ?? 0;
}

/** The three numbers in the Study landing's banner. */
export async function getStudyStats(now = new Date()): Promise<StudyStats> {
  const [today, days] = await Promise.all([
    getDayStats(now),
    getUserDb().getAllAsync<{ date: string }>(STUDY_DAYS_SQL),
  ]);

  return {
    streak: streakFrom(days.map((d) => d.date), dayKey(now)),
    learnedToday: today?.learned ?? 0,
    reviewedToday: today?.reviewed ?? 0,
  };
}
