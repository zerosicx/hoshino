/**
 * The in-session scheduler: which card to show next, and when a card is done.
 *
 * FSRS decides what a rating does to a card; this decides what the session
 * does with the answer. A card is settled when the library moves it to Review
 * or when it has been shown `MAX_SHOWS` times, in which case it stays in
 * Learning and is due again tomorrow. Otherwise it comes back later in the
 * same session, at the time FSRS gave it, shown early rather than making
 * anyone wait for a ten-minute timer, and never straight after itself: at
 * least `GAP` other cards go between two shows, fewer when fewer remain.
 *
 * Pure over plain values, no database, so it runs under Vitest.
 */

import { State } from "ts-fsrs";
import type { StudyCard } from "@/types/study";

export const MAX_SHOWS = 4;
export const GAP = 3;

export interface QueueItem {
  card: StudyCard;
  /** When FSRS wants it next; the session start for a card not yet shown. */
  due: Date;
  shows: number;
  /** The value of `shown` when this card last came up; -1 for never. */
  lastShown: number;
  /** A new word: it had no card when the session began. */
  fresh: boolean;
}

export interface SessionQueue {
  items: QueueItem[];
  /** Cards shown so far, counting re-shows. */
  shown: number;
}

export type Settled = "done" | "capped";

export function createQueue(cards: StudyCard[], start: Date): SessionQueue {
  return {
    items: cards.map((card) => ({
      card,
      due: start,
      shows: 0,
      lastShown: -1,
      fresh: card.card === null,
    })),
    shown: 0,
  };
}

/** One word can sit in two lists; the pair is the identity. */
export function keyOf(card: StudyCard): string {
  return `${card.listId}:${card.entryId}`;
}

/** How many other cards must separate two shows of the same card. */
export function minimumGap(remaining: number): number {
  return Math.max(0, Math.min(GAP, remaining - 1));
}

/**
 * Picks the next card and records the show. A card that has come round again
 * takes precedence over one not yet seen, the point of Again is to see the
 * word while it is fresh, then the unseen cards in the order the session was
 * built, then the earliest-due card waiting on its timer.
 */
export function next(queue: SessionQueue, now: Date): { queue: SessionQueue; item: QueueItem } | null {
  if (queue.items.length === 0) return null;

  const gap = minimumGap(queue.items.length);
  const eligible = queue.items.filter((i) => i.lastShown < 0 || queue.shown - i.lastShown >= gap);
  const pool = eligible.length > 0 ? eligible : queue.items;

  const readyAgain = pool.filter((i) => i.shows > 0 && i.due.getTime() <= now.getTime());
  const unseen = pool.filter((i) => i.shows === 0);
  const pick = earliest(readyAgain) ?? unseen[0] ?? earliest(pool)!;

  const shown = queue.shown + 1;
  const marked: QueueItem = { ...pick, shows: pick.shows + 1, lastShown: shown };
  return {
    queue: { items: queue.items.map((i) => (i === pick ? marked : i)), shown },
    item: marked,
  };
}

/**
 * Applies a rating's outcome. Done when the card reached Review; capped when
 * it has had its shows for today and stays in Learning; otherwise it goes
 * back into the queue at its new due time.
 */
export function settle(
  queue: SessionQueue,
  item: QueueItem,
  rated: StudyCard
): { queue: SessionQueue; settled: Settled | null } {
  const key = keyOf(item.card);
  const rest = queue.items.filter((i) => keyOf(i.card) !== key);

  if (rated.card?.state === State.Review) return { queue: { ...queue, items: rest }, settled: "done" };
  if (item.shows >= MAX_SHOWS) return { queue: { ...queue, items: rest }, settled: "capped" };

  const back: QueueItem = { ...item, card: rated, due: rated.card?.due ?? item.due };
  return { queue: { ...queue, items: [...rest, back] }, settled: null };
}

/** Takes a card out without settling it, for "I already know this". */
export function remove(queue: SessionQueue, card: StudyCard): SessionQueue {
  const key = keyOf(card);
  return { ...queue, items: queue.items.filter((i) => keyOf(i.card) !== key) };
}

function earliest(items: QueueItem[]): QueueItem | undefined {
  let best: QueueItem | undefined;
  for (const i of items) if (!best || i.due.getTime() < best.due.getTime()) best = i;
  return best;
}
