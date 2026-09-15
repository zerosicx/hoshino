/**
 * The scheduling rules, as thin a layer over ts-fsrs as possible.
 *
 * Every decision about when a card comes back is FSRS's; this file only maps
 * our rows onto its `Card`, asks it, and words the answer for the rating bar.
 * No database import, so it runs under Vitest.
 */

import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card,
  type Grade,
} from "ts-fsrs";

export { Rating, State };
export type { Card, Grade };

/**
 * Fuzz nudges each interval by a few percent so cards learned together drift
 * apart instead of all landing on the same day. Otherwise the defaults: 90%
 * target retention and the parameters FSRS was fitted with.
 */
const scheduler = fsrs({ enable_fuzz: true });

/** A card whose 90%-recall interval has reached a month is called mastered. */
export const MASTERED_STABILITY = 30;

export const GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

/** The card after a rating. A null card is a word being rated for the first time. */
export function schedule(card: Card | null, rating: Grade, now: Date): Card {
  const current = card ?? createEmptyCard<Card>(now);
  return scheduler.next(current, now, rating).card;
}

/** What each rating would do, for the labels under the buttons. */
export function previewIntervals(
  card: Card | null,
  now: Date
): Record<Grade, string> {
  const current = card ?? createEmptyCard<Card>(now);
  const log = scheduler.repeat(current, now);
  const out = {} as Record<Grade, string>;
  for (const grade of GRADES) {
    out[grade] = intervalLabel(log[grade].card.due, now);
  }
  return out;
}

/**
 * How far away a due date is, in the shortest unit that reads naturally:
 * "<1m", "6m", "2h", "1d", "3w", "2mo", "1y".
 */
export function intervalLabel(due: Date, now: Date): string {
  const minutes = Math.round((due.getTime() - now.getTime()) / 60_000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.round(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

/** Good and Easy count as remembered, for the accuracy figure. */
export function isCorrect(rating: Grade): boolean {
  return rating === Rating.Good || rating === Rating.Easy;
}
