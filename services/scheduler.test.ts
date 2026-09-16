import { describe, expect, it } from "vitest";
import {
  FAMILIAR_STABILITY,
  GRADES,
  KNOWN_STABILITY,
  MASTERED_STABILITY,
  Rating,
  STAGES,
  State,
  intervalLabel,
  previewIntervals,
  schedule,
  stageOf,
  type Card,
  type Grade,
} from "@/services/scheduler";

const now = new Date("2026-09-15T10:00:00.000Z");
const min = (n: number) => new Date(now.getTime() + n * 60_000);
const day = (n: number) => min(n * 24 * 60);

describe("schedule", () => {
  it("a first rating creates a card that is no longer new", () => {
    for (const grade of GRADES) {
      const card = schedule(null, grade, now);
      expect(card.state).not.toBe(State.New);
      expect(card.reps).toBe(1);
      expect(card.due.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("a better rating means a longer wait", () => {
    const [again, hard, good, easy] = GRADES.map((g) =>
      schedule(null, g, now).due.getTime()
    );
    expect(again).toBeLessThan(hard);
    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });

  it("Easy on a first sight graduates straight to review", () => {
    expect(schedule(null, Rating.Easy, now).state).toBe(State.Review);
  });

  it("Again on a reviewed card is a lapse into relearning", () => {
    let card = schedule(null, Rating.Easy, now);
    const later = new Date(card.due.getTime() + 1000);
    card = schedule(card, Rating.Again, later);
    expect(card.state).toBe(State.Relearning);
    expect(card.lapses).toBe(1);
  });

  it("stability keeps growing under Good, so intervals stretch out", () => {
    let card = schedule(null, Rating.Good, now);
    const intervals: number[] = [];
    for (let i = 0; i < 5; i++) {
      const at = new Date(card.due.getTime() + 1000);
      card = schedule(card, Rating.Good, at);
      intervals.push(card.scheduled_days);
    }
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    }
    expect(card.stability).toBeGreaterThan(intervals[0]);
  });

  it("a review card recalled long after it was due is trusted more, not punished", () => {
    // Only once a card is in review does recall depend on how much was
    // forgotten; the learning steps before that are fixed.
    const base = schedule(null, Rating.Easy, now);
    const onTime = schedule(base, Rating.Good, new Date(base.due.getTime() + 1000));
    const late = schedule(base, Rating.Good, day(30));
    expect(late.stability).toBeGreaterThan(onTime.stability);
  });
});

describe("previewIntervals", () => {
  it("labels every grade, shortest for Again", () => {
    const labels = previewIntervals(null, now);
    expect(Object.keys(labels)).toHaveLength(4);
    expect(labels[Rating.Again]).toMatch(/m$/);
    expect(labels[Rating.Easy]).toMatch(/d$/);
  });
});

describe("intervalLabel", () => {
  it("picks the unit that reads naturally", () => {
    expect(intervalLabel(min(0), now)).toBe("<1m");
    expect(intervalLabel(min(6), now)).toBe("6m");
    expect(intervalLabel(min(90), now)).toBe("2h");
    expect(intervalLabel(day(1), now)).toBe("1d");
    expect(intervalLabel(day(10), now)).toBe("10d");
    expect(intervalLabel(day(21), now)).toBe("3w");
    expect(intervalLabel(day(90), now)).toBe("3mo");
    expect(intervalLabel(day(400), now)).toBe("1y");
  });
});

/**
 * The table in STUDY_ALGORITHM.md §3, checked against the installed library.
 * The minute steps are exact; fuzz spreads only intervals of days, so those
 * are checked as days in ascending order.
 */
describe("the transition table", () => {
  const minutesUntil = (card: Card, from: Date) =>
    Math.round((card.due.getTime() - from.getTime()) / 60_000);
  const daysUntil = (card: Card, from: Date) => minutesUntil(card, from) / (24 * 60);

  it("from New: Again, Hard and Good go to Learning in minutes; Easy to Review in days", () => {
    const again = schedule(null, Rating.Again, now);
    const hard = schedule(null, Rating.Hard, now);
    const good = schedule(null, Rating.Good, now);
    const easy = schedule(null, Rating.Easy, now);

    expect([again.state, hard.state, good.state]).toEqual([State.Learning, State.Learning, State.Learning]);
    expect([again, hard, good].map((c) => minutesUntil(c, now))).toEqual([1, 5, 10]);
    expect(easy.state).toBe(State.Review);
    expect(daysUntil(easy, now)).toBeGreaterThanOrEqual(1);
  });

  it("from Learning: Again and Hard stay in Learning; Good and Easy graduate to Review", () => {
    const learning = schedule(null, Rating.Good, now);
    const later = min(10);
    const again = schedule(learning, Rating.Again, later);
    const hard = schedule(learning, Rating.Hard, later);
    const good = schedule(learning, Rating.Good, later);
    const easy = schedule(learning, Rating.Easy, later);

    expect([again.state, hard.state]).toEqual([State.Learning, State.Learning]);
    expect([again, hard].map((c) => minutesUntil(c, later))).toEqual([5, 10]);
    expect([good.state, easy.state]).toEqual([State.Review, State.Review]);
    expect(daysUntil(good, later)).toBeGreaterThanOrEqual(1);
    expect(daysUntil(easy, later)).toBeGreaterThan(daysUntil(good, later));
  });

  it("from Review: Again lapses into Relearning in minutes; the rest stay in Review, longer each", () => {
    const review = schedule(null, Rating.Easy, now);
    const onTime = new Date(review.due.getTime() + 1000);
    const again = schedule(review, Rating.Again, onTime);
    const grades: Grade[] = [Rating.Hard, Rating.Good, Rating.Easy];
    const [hard, good, easy] = grades.map((g) => schedule(review, g, onTime));

    expect(again.state).toBe(State.Relearning);
    expect(minutesUntil(again, onTime)).toBe(5);
    expect(again.lapses).toBe(1);
    expect([hard.state, good.state, easy.state]).toEqual([State.Review, State.Review, State.Review]);
    expect(daysUntil(hard, onTime)).toBeGreaterThanOrEqual(1);
    expect(daysUntil(good, onTime)).toBeGreaterThan(daysUntil(hard, onTime));
    expect(daysUntil(easy, onTime)).toBeGreaterThan(daysUntil(good, onTime));
  });

  it("from Relearning: Again and Hard stay put in minutes; Good and Easy return to Review", () => {
    const review = schedule(null, Rating.Easy, now);
    const lapsed = schedule(review, Rating.Again, new Date(review.due.getTime() + 1000));
    const later = new Date(lapsed.due.getTime());
    const again = schedule(lapsed, Rating.Again, later);
    const hard = schedule(lapsed, Rating.Hard, later);
    const good = schedule(lapsed, Rating.Good, later);
    const easy = schedule(lapsed, Rating.Easy, later);

    expect([again.state, hard.state]).toEqual([State.Relearning, State.Relearning]);
    expect([again, hard].map((c) => minutesUntil(c, later))).toEqual([5, 10]);
    expect([good.state, easy.state]).toEqual([State.Review, State.Review]);
    expect(daysUntil(good, later)).toBeGreaterThanOrEqual(1);
    expect(daysUntil(easy, later)).toBeGreaterThanOrEqual(daysUntil(good, later));
  });

  it("consecutive Good from new: minutes, then days that stretch out", () => {
    let card = schedule(null, Rating.Good, now);
    expect(card.state).toBe(State.Learning);
    card = schedule(card, Rating.Good, min(10));
    expect(card.state).toBe(State.Review);
    const first = card.scheduled_days;
    card = schedule(card, Rating.Good, new Date(card.due.getTime()));
    expect(card.scheduled_days).toBeGreaterThan(first);
  });
});

describe("stageOf", () => {
  const review = (stability: number): Card => ({
    due: now,
    stability,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 3,
    lapses: 0,
    state: State.Review,
  });

  it("is new for a word never rated", () => {
    expect(stageOf(null)).toBe("new");
    expect(stageOf({ ...review(0), state: State.New })).toBe("new");
  });

  it("is learning while in the minute loop, whatever the stability", () => {
    expect(stageOf(schedule(null, Rating.Good, now))).toBe("learning");
    expect(stageOf({ ...review(50), state: State.Relearning })).toBe("learning");
  });

  it("climbs the ladder with stability", () => {
    expect(stageOf(review(FAMILIAR_STABILITY - 0.1))).toBe("learning");
    expect(stageOf(review(FAMILIAR_STABILITY))).toBe("familiar");
    expect(stageOf(review(KNOWN_STABILITY - 0.1))).toBe("familiar");
    expect(stageOf(review(KNOWN_STABILITY))).toBe("known");
    expect(stageOf(review(MASTERED_STABILITY - 0.1))).toBe("known");
    expect(stageOf(review(MASTERED_STABILITY))).toBe("mastered");
  });

  it("lists the rungs in ladder order", () => {
    expect(STAGES).toEqual(["new", "learning", "familiar", "known", "mastered"]);
  });
});
