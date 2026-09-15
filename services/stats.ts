/**
 * Daily study statistics: the streak, today's accuracy and count.
 *
 * One row per local day in `study_stats`. The streak is derived from those
 * rows at read time rather than cached in `streak_length`, so it cannot
 * disagree with the days it is derived from.
 */

import { getUserDb } from "./database";
import { isCorrect, Rating, type Grade } from "./scheduler";
import {
  RECORD_REVIEW_SQL,
  RECORD_SESSION_SQL,
  STATS_FOR_DAY_SQL,
  STUDY_DAYS_SQL,
  dayKey,
  streakFrom,
  toDailyStats,
  type StatsRow,
} from "./studyQuery";
import type { DailyStats, StudyStats } from "@/types/study";

/** Counts one rating against today. Called inside `rateCard`'s transaction. */
export async function recordReview(rating: Grade, now = new Date()): Promise<void> {
  await getUserDb().runAsync(RECORD_REVIEW_SQL, [
    dayKey(now),
    1,
    isCorrect(rating) ? 1 : 0,
    rating === Rating.Again ? 1 : 0,
    rating === Rating.Hard ? 1 : 0,
    rating === Rating.Easy ? 1 : 0,
  ]);
}

export async function recordSessionStart(now = new Date()): Promise<void> {
  await getUserDb().runAsync(RECORD_SESSION_SQL, [dayKey(now)]);
}

export async function getDayStats(now = new Date()): Promise<DailyStats | null> {
  const row = await getUserDb().getFirstAsync<StatsRow>(STATS_FOR_DAY_SQL, [dayKey(now)]);
  return row ? toDailyStats(row) : null;
}

/** The three numbers in the Study landing's banner. */
export async function getStudyStats(now = new Date()): Promise<StudyStats> {
  const [today, days] = await Promise.all([
    getDayStats(now),
    getUserDb().getAllAsync<{ date: string }>(STUDY_DAYS_SQL),
  ]);

  const reviewed = today?.reviewed ?? 0;
  return {
    streak: streakFrom(days.map((d) => d.date), dayKey(now)),
    accuracy: reviewed > 0 ? Math.round((100 * today!.correct) / reviewed) : null,
    reviewedToday: reviewed,
  };
}
