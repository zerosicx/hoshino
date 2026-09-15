import { useCallback, useEffect, useRef, useState } from "react";
import { getEntry, getExamples } from "@/services/dictionary";
import { buildSession, rateCard, suspendCard } from "@/services/srs";
import { recordSessionStart } from "@/services/stats";
import { Rating, previewIntervals, type Grade } from "@/services/scheduler";
import type { CardContent, StudyCard } from "@/types/study";

export interface SessionTally {
  reviewed: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

const EMPTY_TALLY: SessionTally = { reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 };

/**
 * One pass through a pile of cards.
 *
 * Each rating is written the moment it is given, so leaving early loses
 * nothing. A card rated Again comes back once at the end of the same session:
 * the point of Again is to see it again while it is fresh, and the next pile
 * may be tomorrow.
 */
export function useStudySession(listIds: number[], size: number) {
  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [content, setContent] = useState<CardContent | null>(null);
  const [tally, setTally] = useState<SessionTally>(EMPTY_TALLY);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const cache = useRef(new Map<number, CardContent>());
  const retried = useRef(new Set<number>());
  const key = listIds.join(",");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const items = await buildSession(listIds, size);
      if (cancelled) return;
      if (items.length > 0) await recordSessionStart();
      setQueue(items);
      setTotal(items.length);
      setIndex(0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Rebuilding on every render of the array would restart the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, size]);

  const load = useCallback(async (entryId: number): Promise<CardContent | null> => {
    const hit = cache.current.get(entryId);
    if (hit) return hit;
    const [entry, examples] = await Promise.all([getEntry(entryId), getExamples(entryId)]);
    if (!entry) return null;
    const loaded = { entry, examples };
    cache.current.set(entryId, loaded);
    return loaded;
  }, []);

  const current = queue[index] ?? null;

  // The current card's content, with the next one fetched behind it.
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setContent(cache.current.get(current.entryId) ?? null);
    load(current.entryId).then((c) => {
      if (!cancelled) setContent(c);
    });
    const next = queue[index + 1];
    if (next) load(next.entryId);
    return () => {
      cancelled = true;
    };
  }, [current, index, queue, load]);

  const reveal = useCallback(() => setRevealed(true), []);

  const advance = useCallback(() => {
    setRevealed(false);
    setIndex((i) => i + 1);
  }, []);

  const rate = useCallback(
    async (grade: Grade) => {
      if (!current) return;
      const rated = await rateCard(current, grade);

      setTally((t) => ({
        reviewed: t.reviewed + 1,
        again: t.again + (grade === Rating.Again ? 1 : 0),
        hard: t.hard + (grade === Rating.Hard ? 1 : 0),
        good: t.good + (grade === Rating.Good ? 1 : 0),
        easy: t.easy + (grade === Rating.Easy ? 1 : 0),
      }));

      if (grade === Rating.Again && !retried.current.has(current.entryId)) {
        retried.current.add(current.entryId);
        setQueue((q) => [...q, rated]);
        setTotal((n) => n + 1);
      }
      advance();
    },
    [current, advance]
  );

  /** "I already know this": drops the card from study and moves on. */
  const suspend = useCallback(async () => {
    if (!current) return;
    await suspendCard(current.entryId, current.listId);
    setTotal((n) => n - 1);
    setQueue((q) => q.filter((_, i) => i !== index));
    setRevealed(false);
  }, [current, index]);

  const finished = !loading && (queue.length === 0 || index >= queue.length);
  const intervals = current ? previewIntervals(current.card, new Date()) : null;

  return {
    loading,
    finished,
    current,
    content,
    revealed,
    intervals,
    position: Math.min(index + 1, total),
    total,
    tally,
    reveal,
    rate,
    suspend,
  };
}
