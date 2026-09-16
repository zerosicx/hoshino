import { useCallback, useEffect, useRef, useState } from "react";
import { getEntry, getExamples } from "@/services/dictionary";
import { buildSession, rateCard, suspendCard } from "@/services/srs";
import { recordSessionStart } from "@/services/stats";
import { Rating, previewIntervals, stageOf, type Grade } from "@/services/scheduler";
import {
  createQueue,
  next as nextInQueue,
  remove as removeFromQueue,
  settle,
  type QueueItem,
  type SessionQueue,
} from "@/services/sessionQueue";
import type { CardContent, SessionMode, StudyCard } from "@/types/study";

export interface SessionTally {
  /** Ratings given, counting re-shows. */
  ratings: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
  /** New words the session introduced. */
  introduced: number;
  /** Of those, the ones that reached Review. */
  learned: number;
  /** Due cards settled, in Review or capped. */
  reviews: number;
  /** Cards that hit the show cap and stay in Learning for tomorrow. */
  stillLearning: number;
}

const EMPTY_TALLY: SessionTally = {
  ratings: 0,
  again: 0,
  hard: 0,
  good: 0,
  easy: 0,
  introduced: 0,
  learned: 0,
  reviews: 0,
  stillLearning: 0,
};

export interface SessionSettings {
  mode: SessionMode;
  sessionSize: number;
  newPerDay: number;
}

/** The card on screen, and the instant it came up. */
interface Showing {
  item: QueueItem;
  /** One instant for the interval labels and the rating: FSRS seeds its fuzz
   *  from the review time, so two clocks would promise one interval and give
   *  another. */
  at: Date;
}

/**
 * One session: a queue of cards that runs until each is settled.
 *
 * Each rating is written the moment it is given, so leaving early loses
 * nothing. A card comes back within the session until FSRS moves it to Review
 * or it has had four shows (`services/sessionQueue.ts`); the header counts
 * settled cards, not ratings. The mode decides what `buildSession` puts in.
 */
export function useStudySession(listIds: number[], settings: SessionSettings) {
  const { mode, sessionSize, newPerDay } = settings;
  const [queue, setQueue] = useState<SessionQueue>(() => createQueue([], new Date()));
  const [showing, setShowing] = useState<Showing | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [content, setContent] = useState<CardContent | null>(null);
  const [tally, setTally] = useState<SessionTally>(EMPTY_TALLY);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [settled, setSettled] = useState(0);
  const [budgetSpent, setBudgetSpent] = useState(false);

  const cache = useRef(new Map<number, CardContent>());
  const key = listIds.join(",");

  /** Advances to the next card, or to nothing when the queue is empty. */
  const show = useCallback((q: SessionQueue) => {
    const now = new Date();
    const picked = nextInQueue(q, now);
    setQueue(picked ? picked.queue : q);
    setShowing(picked ? { item: picked.item, at: now } : null);
    setRevealed(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const start = new Date();
      const session = await buildSession(listIds, { mode, sessionSize, newPerDay, now: start });
      if (cancelled) return;
      if (session.cards.length > 0) await recordSessionStart(start);
      if (cancelled) return;
      setTotal(session.cards.length);
      setSettled(0);
      setTally({ ...EMPTY_TALLY, introduced: session.fresh });
      setBudgetSpent(session.budgetSpent);
      show(createQueue(session.cards, start));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Rebuilding on every render of the array would restart the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mode, sessionSize, newPerDay]);

  const load = useCallback(async (entryId: number): Promise<CardContent | null> => {
    const hit = cache.current.get(entryId);
    if (hit) return hit;
    const [entry, examples] = await Promise.all([getEntry(entryId), getExamples(entryId)]);
    if (!entry) return null;
    const loaded = { entry, examples };
    cache.current.set(entryId, loaded);
    return loaded;
  }, []);

  const current = showing?.item.card ?? null;

  // The current card's content, with the likely next one fetched behind it.
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setContent(cache.current.get(current.entryId) ?? null);
    load(current.entryId).then((c) => {
      if (!cancelled) setContent(c);
    });
    const upcoming = queue.items.find((i) => i.shows === 0 && i.card.entryId !== current.entryId);
    if (upcoming) load(upcoming.card.entryId);
    return () => {
      cancelled = true;
    };
  }, [current, queue, load]);

  const reveal = useCallback(() => setRevealed(true), []);

  const rate = useCallback(
    async (grade: Grade) => {
      if (!showing) return;
      const rated = await rateCard(showing.item.card, grade, showing.at);
      const outcome = settle(queue, showing.item, rated);

      setTally((t) => ({
        ...t,
        ratings: t.ratings + 1,
        again: t.again + (grade === Rating.Again ? 1 : 0),
        hard: t.hard + (grade === Rating.Hard ? 1 : 0),
        good: t.good + (grade === Rating.Good ? 1 : 0),
        easy: t.easy + (grade === Rating.Easy ? 1 : 0),
        learned: t.learned + (outcome.settled === "done" && showing.item.fresh ? 1 : 0),
        reviews: t.reviews + (outcome.settled && !showing.item.fresh ? 1 : 0),
        stillLearning: t.stillLearning + (outcome.settled === "capped" ? 1 : 0),
      }));
      if (outcome.settled) setSettled((n) => n + 1);
      show(outcome.queue);
    },
    [showing, queue, show]
  );

  /** "I already know this": drops the card from study and moves on. */
  const suspend = useCallback(async () => {
    if (!showing) return;
    await suspendCard(showing.item.card.entryId, showing.item.card.listId);
    setTotal((n) => n - 1);
    if (showing.item.fresh) setTally((t) => ({ ...t, introduced: t.introduced - 1 }));
    show(removeFromQueue(queue, showing.item.card));
  }, [showing, queue, show]);

  const finished = !loading && showing === null;
  const intervals = showing ? previewIntervals(showing.item.card.card, showing.at) : null;
  const stage = showing ? stageOf(showing.item.card.card) : null;

  return {
    loading,
    finished,
    current,
    content,
    revealed,
    intervals,
    stage,
    /** Cards settled so far, of the distinct cards in the session. */
    settled,
    total,
    tally,
    budgetSpent,
    reveal,
    rate,
    suspend,
  };
}
