import { describe, expect, it } from "vitest";
import { Rating, State, schedule, type Card } from "@/services/scheduler";
import {
  MAX_SHOWS,
  createQueue,
  minimumGap,
  next,
  remove,
  settle,
  type SessionQueue,
} from "@/services/sessionQueue";
import type { StudyCard } from "@/types/study";

const start = new Date("2026-09-17T09:00:00.000Z");
const at = (seconds: number) => new Date(start.getTime() + seconds * 1000);

const fresh = (entryId: number): StudyCard => ({ entryId, listId: 1, card: null, suspended: false });

/** A card in a given state, due at a given moment. */
function withCard(entryId: number, state: State, due: Date): StudyCard {
  const card: Card = {
    due,
    stability: 1,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 1,
    lapses: 0,
    state,
    last_review: start,
  };
  return { entryId, listId: 1, card, suspended: false };
}

/** Shows the next card and rates it, the way the hook does. */
function rate(queue: SessionQueue, grade: Rating, now: Date) {
  const shown = next(queue, now)!;
  const rated: StudyCard = {
    ...shown.item.card,
    card: schedule(shown.item.card.card, grade as 1 | 2 | 3 | 4, now),
  };
  const result = settle(shown.queue, shown.item, rated);
  return { ...result, entryId: shown.item.card.entryId };
}

describe("minimumGap", () => {
  it("is three other cards, two when fewer than four remain, none when alone", () => {
    expect(minimumGap(10)).toBe(3);
    expect(minimumGap(4)).toBe(3);
    expect(minimumGap(3)).toBe(2);
    expect(minimumGap(2)).toBe(1);
    expect(minimumGap(1)).toBe(0);
  });
});

describe("next", () => {
  it("shows unseen cards in the order the session was built", () => {
    let queue = createQueue([fresh(1), fresh(2), fresh(3)], start);
    const order: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = next(queue, at(i))!;
      order.push(r.item.card.entryId);
      queue = r.queue;
    }
    expect(order).toEqual([1, 2, 3]);
    expect(queue.shown).toBe(3);
  });

  it("returns nothing for an empty queue", () => {
    expect(next(createQueue([], start), start)).toBeNull();
  });

  it("shows a card that has come due again before a card not yet seen", () => {
    // Ten cards; the first is rated Again and comes due a minute later.
    let queue = createQueue(Array.from({ length: 10 }, (_, i) => fresh(i + 1)), start);
    const first = rate(queue, Rating.Again, at(0));
    expect(first.settled).toBeNull();
    queue = first.queue;

    // Three others must go between; each takes fifteen seconds.
    const shownAfter: number[] = [];
    let clock = 15;
    for (let i = 0; i < 5; i++) {
      const r = rate(queue, Rating.Good, at(clock));
      shownAfter.push(r.entryId);
      queue = r.queue;
      clock += 15;
    }
    // Due at +60s and eligible after three others: back as the fourth card.
    expect(shownAfter).toEqual([2, 3, 4, 1, 5]);
  });

  it("keeps the gap even when the card is overdue", () => {
    let queue = createQueue([fresh(1), fresh(2), fresh(3), fresh(4), fresh(5)], start);
    queue = rate(queue, Rating.Again, at(0)).queue;
    // Long after it came due, it still waits for three other cards.
    const seen = [1, 2, 3].map(() => {
      const r = rate(queue, Rating.Good, at(600));
      queue = r.queue;
      return r.entryId;
    });
    expect(seen).toEqual([2, 3, 4]);
    expect(next(queue, at(600))!.item.card.entryId).toBe(1);
  });

  it("shows a waiting card early rather than making anyone wait for its timer", () => {
    let queue = createQueue([fresh(1), fresh(2)], start);
    queue = rate(queue, Rating.Good, at(0)).queue; //  due in ten minutes
    queue = rate(queue, Rating.Good, at(15)).queue; // due in ten minutes
    const r = next(queue, at(30))!;
    expect(r.item.card.entryId).toBe(1);
    expect(r.item.due.getTime()).toBeGreaterThan(at(30).getTime());
  });

  it("orders re-shows by due time, so Again comes round most often", () => {
    // Three cards graded Good, Hard, Again, then three graded Easy and gone.
    // The three left are all eligible and all due; due order wins, not the
    // order they were first shown.
    let queue = createQueue([1, 2, 3, 4, 5, 6].map(fresh), start);
    queue = rate(queue, Rating.Good, at(0)).queue; //   1: +10m
    queue = rate(queue, Rating.Hard, at(15)).queue; //  2: +5m
    queue = rate(queue, Rating.Again, at(30)).queue; // 3: +1m
    for (const t of [45, 60, 75]) queue = rate(queue, Rating.Easy, at(t)).queue;
    expect(queue.items).toHaveLength(3);

    const order: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = next(queue, at(700 + i));
      order.push(r!.item.card.entryId);
      queue = r!.queue;
    }
    expect(order).toEqual([3, 2, 1]);
  });

  it("alternates two cards that keep getting Again until both are capped", () => {
    let queue = createQueue([fresh(1), fresh(2)], start);
    const order: number[] = [];
    for (let i = 0; i < 8; i++) {
      const r = rate(queue, Rating.Again, at(i * 100));
      order.push(r.entryId);
      queue = r.queue;
    }
    expect(order).toEqual([1, 2, 1, 2, 1, 2, 1, 2]);
    expect(queue.items).toHaveLength(0);
  });

  it("shows a lone card straight after itself", () => {
    let queue = createQueue([fresh(1)], start);
    const first = rate(queue, Rating.Again, at(0));
    expect(first.settled).toBeNull();
    queue = first.queue;
    expect(next(queue, at(1))!.item.card.entryId).toBe(1);
  });
});

describe("settle", () => {
  it("is done when the rating moved the card to Review", () => {
    const queue = createQueue([fresh(1), fresh(2)], start);
    const r = rate(queue, Rating.Easy, start);
    expect(r.settled).toBe("done");
    expect(r.queue.items.map((i) => i.card.entryId)).toEqual([2]);
  });

  it("re-queues a card still in Learning, at the time FSRS gave it", () => {
    const queue = createQueue([fresh(1), fresh(2)], start);
    const r = rate(queue, Rating.Good, start);
    expect(r.settled).toBeNull();
    const back = r.queue.items.find((i) => i.card.entryId === 1)!;
    expect(back.shows).toBe(1);
    expect(back.card.card?.state).toBe(State.Learning);
    expect(back.due.getTime()).toBe(start.getTime() + 10 * 60_000);
  });

  it("caps a card at four shows and leaves it in Learning for tomorrow", () => {
    let queue = createQueue([fresh(1)], start);
    const outcomes: (string | null)[] = [];
    for (let i = 0; i < MAX_SHOWS; i++) {
      const r = rate(queue, Rating.Again, at(i * 90));
      outcomes.push(r.settled);
      queue = r.queue;
    }
    expect(outcomes).toEqual([null, null, null, "capped"]);
    expect(queue.items).toHaveLength(0);
  });

  it("a due Review card rated Good is done in one show", () => {
    const due = withCard(1, State.Review, at(-86_400));
    const r = rate(createQueue([due], start), Rating.Good, start);
    expect(r.settled).toBe("done");
  });

  it("a lapsed card comes back until it is relearned", () => {
    const due = withCard(1, State.Review, at(-86_400));
    let queue = createQueue([due, fresh(2)], start);
    const lapse = rate(queue, Rating.Again, start);
    expect(lapse.settled).toBeNull();
    queue = lapse.queue;
    expect(queue.items.find((i) => i.card.entryId === 1)!.card.card?.state).toBe(State.Relearning);

    queue = rate(queue, Rating.Easy, at(10)).queue; // card 2, done
    const back = rate(queue, Rating.Good, at(400)); // card 1 again
    expect(back.entryId).toBe(1);
    expect(back.settled).toBe("done");
  });

  it("remembers which cards were new when the session began", () => {
    const queue = createQueue([fresh(1), withCard(2, State.Review, start)], start);
    expect(queue.items.map((i) => i.fresh)).toEqual([true, false]);
    const r = rate(queue, Rating.Good, start);
    expect(r.queue.items.find((i) => i.card.entryId === 1)!.fresh).toBe(true);
  });
});

describe("remove", () => {
  it("drops a card without settling it, by word and list", () => {
    const twin: StudyCard = { ...fresh(1), listId: 2 };
    const queue = createQueue([fresh(1), twin, fresh(3)], start);
    const after = remove(queue, fresh(1));
    expect(after.items.map((i) => `${i.card.listId}:${i.card.entryId}`)).toEqual(["2:1", "1:3"]);
  });
});
