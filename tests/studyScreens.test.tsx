import { Text } from "react-native";
import { renderRouter, screen, act, fireEvent } from "expo-router/testing-library";
import StudyScreen from "@/app/(tabs)/study/index";
import SessionScreen, { sessionSummary } from "@/app/(tabs)/study/session";
import { Rating, State } from "@/services/scheduler";
import type { ActiveList, StudyCard } from "@/types/study";
import type { DictionaryEntry } from "@/types/dictionary";

jest.mock("@/services/srs");
jest.mock("@/services/stats");
jest.mock("@/services/dictionary");
jest.mock("@/services/lists");

const srs = jest.requireMock("@/services/srs");
const stats = jest.requireMock("@/services/stats");
const dictionary = jest.requireMock("@/services/dictionary");

const routes = {
  "(tabs)/study/index": StudyScreen,
  "(tabs)/study/session": SessionScreen,
  "(tabs)/lists/index": () => <Text>lists</Text>,
  "word/[id]": () => <Text>word page</Text>,
};

const entry = (id: number, word: string): DictionaryEntry => ({
  id,
  kanjiForms: [word],
  readingForms: [word],
  senses: [{ glosses: [`meaning of ${word}`], pos: [], misc: [], info: [] }],
  jlptLevel: null,
  isCommon: false,
  tags: [],
  wordClass: null,
  furigana: [{ base: word, reading: "" }],
});

const active: ActiveList = {
  list: {
    id: 3,
    name: "Verbs",
    type: "custom",
    jlptLevel: null,
    starred: false,
    itemCount: 10,
    lastActivity: "2026-01-01T00:00:00.000Z",
  },
  progress: { listId: 3, total: 10, newCount: 5, learning: 2, familiar: 1, known: 1, mastered: 1, due: 4, suspended: 0 },
};

const withDue = (due: number, newCount = 5): ActiveList => ({
  ...active,
  progress: { ...active.progress, due, newCount },
});

const newCard = (entryId: number): StudyCard => ({ entryId, listId: 3, card: null, suspended: false });

const dueCard = (entryId: number): StudyCard => ({
  entryId,
  listId: 3,
  suspended: false,
  card: {
    due: new Date(Date.now() - 86_400_000),
    stability: 3,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 3,
    reps: 2,
    lapses: 0,
    state: State.Review,
  },
});

/** What `buildSession` returns for a pile of cards. */
const session = (cards: StudyCard[], budgetSpent = false) => ({
  cards,
  due: cards.filter((c) => c.card !== null).length,
  fresh: cards.filter((c) => c.card === null).length,
  budgetSpent,
});

/** A rating that leaves the card in the given state, due a minute later. */
const rateTo = (state: State) => async (item: StudyCard) => ({
  ...item,
  card: {
    due: new Date(Date.now() + 60_000),
    stability: 1,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: (item.card?.reps ?? 0) + 1,
    lapses: 0,
    state,
  },
});

async function reveal() {
  await act(async () => fireEvent.press(screen.getByLabelText("Reveal answer")));
}

async function rate(label: string) {
  await act(async () => fireEvent.press(screen.getByLabelText(label)));
}

beforeEach(() => {
  stats.getStudyStats.mockResolvedValue({ streak: 3, learnedToday: 8, reviewedToday: 12 });
  stats.getNewToday.mockResolvedValue(0);
  stats.recordSessionStart.mockResolvedValue(undefined);
  dictionary.getEntry.mockImplementation(async (id: number) => entry(id, `word${id}`));
  dictionary.getExamples.mockResolvedValue([]);
  srs.rateCard.mockImplementation(rateTo(State.Review));
});

afterEach(() => jest.resetAllMocks());

describe("study landing", () => {
  it("explains how to start when nothing is studied yet", async () => {
    srs.getActiveLists.mockResolvedValue([]);
    renderRouter(routes, { initialUrl: "/study" });
    await act(async () => {});

    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("Learned today")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.queryByText(/Accuracy/)).toBeNull();
    expect(screen.getByText(/Nothing in study yet/)).toBeTruthy();
    expect(screen.queryByLabelText("Start")).toBeNull();
  });

  it("says what the session will hold: due cards, then new words within the budget", async () => {
    srs.getActiveLists.mockResolvedValue([withDue(6)]);
    stats.getNewToday.mockResolvedValue(6); // 4 of 10 left today
    renderRouter(routes, { initialUrl: "/study" });
    await act(async () => {});

    expect(screen.getByText("6 due · 4 new")).toBeTruthy();
    expect(screen.getByText("Verbs")).toBeTruthy();
  });

  it("caps the due count at the session size and never shows the backlog", async () => {
    srs.getActiveLists.mockResolvedValue([withDue(340)]);
    renderRouter(routes, { initialUrl: "/study" });
    await act(async () => {});

    // The bar and the list's pill both say so.
    expect(screen.getAllByText("20 due")).toHaveLength(2);
    expect(screen.queryByText(/340/)).toBeNull();
    // A full session of due cards leaves no room for new words.
    expect(screen.queryByText(/due · \d+ new/)).toBeNull();
  });

  it("opens a mixed session from the bar", async () => {
    srs.getActiveLists.mockResolvedValue([active]);
    srs.buildSession.mockResolvedValue(session([]));
    renderRouter(routes, { initialUrl: "/study" });
    await act(async () => {});

    await act(async () => fireEvent.press(screen.getByLabelText("Start")));
    expect(screen).toHavePathname("/study/session");
    expect(screen).toHaveSearchParams({ lists: "all" });
  });

  it("offers Learn more once today's new words are done and nothing is due", async () => {
    srs.getActiveLists.mockResolvedValue([withDue(0)]);
    stats.getNewToday.mockResolvedValue(10);
    srs.buildSession.mockResolvedValue(session([]));
    renderRouter(routes, { initialUrl: "/study" });
    await act(async () => {});

    expect(screen.getByText("Done for today")).toBeTruthy();
    expect(screen.queryByLabelText("Review only")).toBeNull();
    await act(async () => fireEvent.press(screen.getByLabelText("Learn more")));
    expect(screen).toHaveSearchParams({ lists: "all", mode: "learn" });
  });

  it("offers Review only whenever anything is due, even a full session's worth", async () => {
    srs.getActiveLists.mockResolvedValue([withDue(40)]);
    srs.buildSession.mockResolvedValue(session([]));
    renderRouter(routes, { initialUrl: "/study" });
    await act(async () => {});

    expect(screen.getByText(/Review only · 20 cards/)).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByLabelText("Review only")));
    expect(screen).toHaveSearchParams({ lists: "all", mode: "review" });
  });

  it("hides Review only when nothing is due", async () => {
    srs.getActiveLists.mockResolvedValue([withDue(0)]);
    renderRouter(routes, { initialUrl: "/study" });
    await act(async () => {});
    expect(screen.queryByLabelText("Review only")).toBeNull();
  });

  it("reviews one list from its row, or studies it by tapping the row", async () => {
    srs.getActiveLists.mockResolvedValue([withDue(4)]);
    srs.buildSession.mockResolvedValue(session([]));
    renderRouter(routes, { initialUrl: "/study" });
    await act(async () => {});

    await act(async () => fireEvent.press(screen.getByLabelText("Review Verbs")));
    expect(screen).toHaveSearchParams({ lists: "3", mode: "review" });

    screen.unmount();
    renderRouter(routes, { initialUrl: "/study" });
    await act(async () => {});
    await act(async () => fireEvent.press(screen.getByText("Verbs")));
    expect(screen).toHaveSearchParams({ lists: "3" });
  });
});

describe("study session", () => {
  it("runs until every card is settled: reveal, rate, next, finish", async () => {
    srs.buildSession.mockResolvedValue(session([newCard(1), newCard(2)]));
    renderRouter(routes, { initialUrl: "/study/session?lists=3" });
    await act(async () => {});

    expect(screen.getByText("Settled 0 of 2")).toBeTruthy();
    expect(screen.queryByLabelText("Good")).toBeNull();
    expect(screen.getByText("New")).toBeTruthy();

    await reveal();
    await rate("Good");
    expect(srs.rateCard).toHaveBeenCalledWith(newCard(1), Rating.Good, expect.any(Date));
    expect(screen.getByText("Settled 1 of 2")).toBeTruthy();

    await reveal();
    await rate("Easy");
    expect(screen.getByText("Session complete")).toBeTruthy();
    expect(screen.getByText("2 of 2 new words learned")).toBeTruthy();
  });

  it("rates a card at the instant it came up, the same one its intervals were drawn from", async () => {
    srs.buildSession.mockResolvedValue(session([newCard(1)]));
    renderRouter(routes, { initialUrl: "/study/session?lists=3" });
    await act(async () => {});
    await reveal();
    await act(async () => {});
    await rate("Good");
    const at: Date = srs.rateCard.mock.calls[0][2];
    expect(at.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("brings a card still in Learning back until it reaches Review", async () => {
    srs.buildSession.mockResolvedValue(session([newCard(1)]));
    srs.rateCard.mockImplementation(rateTo(State.Learning));
    renderRouter(routes, { initialUrl: "/study/session?lists=3" });
    await act(async () => {});

    await reveal();
    await rate("Again");
    // Alone in the queue, so it comes straight back; nothing is settled yet.
    expect(screen.getByText("Settled 0 of 1")).toBeTruthy();
    expect(screen.getByText("Learning")).toBeTruthy();

    srs.rateCard.mockImplementation(rateTo(State.Review));
    await reveal();
    await rate("Good");
    expect(screen.getByText("Session complete")).toBeTruthy();
    expect(screen.getByText("1 of 1 new word learned")).toBeTruthy();
  });

  it("stops after four shows and leaves the card for tomorrow", async () => {
    srs.buildSession.mockResolvedValue(session([newCard(1)]));
    srs.rateCard.mockImplementation(rateTo(State.Learning));
    renderRouter(routes, { initialUrl: "/study/session?lists=3" });
    await act(async () => {});

    for (let i = 0; i < 4; i++) {
      await reveal();
      await rate("Again");
    }
    expect(srs.rateCard).toHaveBeenCalledTimes(4);
    expect(screen.getByText("Session complete")).toBeTruthy();
    expect(screen.getByText("0 of 1 new word learned · 1 still learning, back tomorrow")).toBeTruthy();
  });

  it("counts due cards as reviews, apart from new words", async () => {
    srs.buildSession.mockResolvedValue(session([dueCard(1), dueCard(2), newCard(3)]));
    renderRouter(routes, { initialUrl: "/study/session?lists=3" });
    await act(async () => {});
    expect(screen.getByText("Familiar")).toBeTruthy();

    for (const grade of ["Good", "Good", "Easy"]) {
      await reveal();
      await rate(grade);
    }
    expect(screen.getByText("1 of 1 new word learned · 2 reviews")).toBeTruthy();
  });

  it("says so when there is nothing to study", async () => {
    srs.buildSession.mockResolvedValue(session([]));
    renderRouter(routes, { initialUrl: "/study/session?lists=3" });
    await act(async () => {});
    expect(screen.getByText("Nothing to study")).toBeTruthy();
    expect(stats.recordSessionStart).not.toHaveBeenCalled();
  });

  it("offers Learn more when the budget is spent and nothing is due", async () => {
    srs.buildSession.mockResolvedValue(session([], true));
    renderRouter(routes, { initialUrl: "/study/session?lists=3" });
    await act(async () => {});
    expect(screen.getByText("Done for today")).toBeTruthy();

    await act(async () => fireEvent.press(screen.getByText("Learn more")));
    expect(screen).toHaveSearchParams({ lists: "3", mode: "learn" });
    expect(srs.buildSession).toHaveBeenLastCalledWith([3], expect.objectContaining({ mode: "learn" }));
  });

  it("marks a word known from the corner menu and moves on", async () => {
    srs.buildSession.mockResolvedValue(session([newCard(1), newCard(2)]));
    srs.suspendCard.mockResolvedValue(undefined);
    renderRouter(routes, { initialUrl: "/study/session?lists=3" });
    await act(async () => {});

    await act(async () => fireEvent.press(screen.getByLabelText("Card options")));
    await act(async () => fireEvent.press(screen.getByText("I already know this")));
    expect(srs.suspendCard).toHaveBeenCalledWith(1, 3);
    expect(screen.getByText("Settled 0 of 1")).toBeTruthy();
  });

  it("resolves every active list for a combined session, with the settings", async () => {
    srs.getActiveLists.mockResolvedValue([active, { ...active, list: { ...active.list, id: 9 } }]);
    srs.buildSession.mockResolvedValue(session([]));
    renderRouter(routes, { initialUrl: "/study/session?lists=all" });
    await act(async () => {});
    expect(srs.buildSession).toHaveBeenCalledWith([3, 9], {
      mode: "mixed",
      sessionSize: 20,
      newPerDay: 10,
      now: expect.any(Date),
    });
  });

  it("takes due cards only in review mode, and offers new words when none are due", async () => {
    srs.buildSession.mockResolvedValue(session([]));
    renderRouter(routes, { initialUrl: "/study/session?lists=3&mode=review" });
    await act(async () => {});

    expect(srs.buildSession).toHaveBeenCalledWith([3], expect.objectContaining({ mode: "review" }));
    expect(screen.getByText("Nothing due right now")).toBeTruthy();

    await act(async () => fireEvent.press(screen.getByText("Learn new words")));
    expect(screen).toHaveSearchParams({ lists: "3", mode: "mixed" });
    expect(srs.buildSession).toHaveBeenLastCalledWith([3], expect.objectContaining({ mode: "mixed" }));
  });

  it("labels a review-only session and its completion", async () => {
    srs.buildSession.mockResolvedValue(session([dueCard(1)]));
    renderRouter(routes, { initialUrl: "/study/session?lists=3&mode=review" });
    await act(async () => {});
    expect(screen.getByText("Review only")).toBeTruthy();

    await reveal();
    await rate("Good");
    expect(screen.getByText("Review complete")).toBeTruthy();
    expect(screen.getByText("1 review")).toBeTruthy();
  });

  it("labels a learn session", async () => {
    srs.buildSession.mockResolvedValue(session([newCard(1)]));
    renderRouter(routes, { initialUrl: "/study/session?lists=3&mode=learn" });
    await act(async () => {});
    expect(screen.getByText("Learning more")).toBeTruthy();
    expect(srs.buildSession).toHaveBeenCalledWith([3], expect.objectContaining({ mode: "learn" }));
  });
});

describe("sessionSummary", () => {
  const base = { ratings: 0, again: 0, hard: 0, good: 0, easy: 0, introduced: 0, learned: 0, reviews: 0, stillLearning: 0 };

  it("joins the parts that are not zero", () => {
    expect(sessionSummary({ ...base, introduced: 10, learned: 8, reviews: 12, stillLearning: 2 })).toBe(
      "8 of 10 new words learned · 12 reviews · 2 still learning, back tomorrow"
    );
    expect(sessionSummary({ ...base, reviews: 1 })).toBe("1 review");
    expect(sessionSummary({ ...base, introduced: 1, learned: 1 })).toBe("1 of 1 new word learned");
  });
});
