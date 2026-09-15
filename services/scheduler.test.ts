import { describe, expect, it } from "vitest";
import {
  GRADES,
  Rating,
  State,
  intervalLabel,
  isCorrect,
  previewIntervals,
  schedule,
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

describe("isCorrect", () => {
  it("counts Good and Easy as remembered", () => {
    expect(isCorrect(Rating.Again)).toBe(false);
    expect(isCorrect(Rating.Hard)).toBe(false);
    expect(isCorrect(Rating.Good)).toBe(true);
    expect(isCorrect(Rating.Easy)).toBe(true);
  });
});
