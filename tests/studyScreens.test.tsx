import { Text } from "react-native";
import { renderRouter, screen, act, fireEvent } from "expo-router/testing-library";
import StudyScreen from "@/app/(tabs)/study/index";
import SessionScreen from "@/app/(tabs)/study/session";
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
  progress: { listId: 3, total: 10, newCount: 5, learning: 2, review: 2, mastered: 1, due: 4, suspended: 0 },
};

const newCard = (entryId: number): StudyCard => ({ entryId, listId: 3, card: null, suspended: false });

beforeEach(() => {
  stats.getStudyStats.mockResolvedValue({ streak: 3, accuracy: 80, reviewedToday: 12 });
  stats.recordSessionStart.mockResolvedValue(undefined);
  dictionary.getEntry.mockImplementation(async (id: number) => entry(id, `word${id}`));
  dictionary.getExamples.mockResolvedValue([]);
  srs.rateCard.mockImplementation(async (item: StudyCard) => ({
    ...item,
    card: {
      due: new Date(),
      stability: 1,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 1,
      lapses: 0,
      state: State.Review,
    },
  }));
});

afterEach(() => jest.resetAllMocks());

describe("study landing", () => {
  it("explains how to start when nothing is studied yet", async () => {
    srs.getActiveLists.mockResolvedValue([]);
    renderRouter(routes, { initialUrl: "/study" });
    await act(async () => {});

    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("80%")).toBeTruthy();
    expect(screen.getByText(/Nothing in study yet/)).toBeTruthy();
    expect(screen.queryByLabelText("Start review")).toBeNull();
  });

  it("shows the pile, never the backlog, and lists what is active", async () => {
    srs.getActiveLists.mockResolvedValue([
      { ...active, progress: { ...active.progress, due: 340 } },
    ]);
    renderRouter(routes, { initialUrl: "/study" });
    await act(async () => {});

    expect(screen.getByText("Verbs")).toBeTruthy();
    expect(screen.getByText("20 cards ready")).toBeTruthy();
    expect(screen.queryByText(/340/)).toBeNull();
  });

  it("opens a combined session from the due bar", async () => {
    srs.getActiveLists.mockResolvedValue([active]);
    srs.buildSession.mockResolvedValue([]);
    renderRouter(routes, { initialUrl: "/study" });
    await act(async () => {});

    await act(async () => fireEvent.press(screen.getByLabelText("Start review")));
    expect(screen).toHavePathname("/study/session");
    expect(screen).toHaveSearchParams({ lists: "all" });
  });
});

describe("study session", () => {
  it("runs through the pile: reveal, rate, next, finish", async () => {
    srs.buildSession.mockResolvedValue([newCard(1), newCard(2)]);
    renderRouter(routes, { initialUrl: "/study/session?lists=3" });
    await act(async () => {});

    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.queryByLabelText("Good")).toBeNull();

    await act(async () => fireEvent.press(screen.getByLabelText("Reveal answer")));
    await act(async () => fireEvent.press(screen.getByLabelText("Good")));
    expect(srs.rateCard).toHaveBeenCalledWith(newCard(1), Rating.Good);
    expect(screen.getByText("2 / 2")).toBeTruthy();

    await act(async () => fireEvent.press(screen.getByLabelText("Reveal answer")));
    await act(async () => fireEvent.press(screen.getByLabelText("Easy")));
    expect(screen.getByText("Session complete")).toBeTruthy();
    expect(screen.getByText("2 cards reviewed")).toBeTruthy();
  });

  it("brings a card rated Again back at the end of the session", async () => {
    srs.buildSession.mockResolvedValue([newCard(1)]);
    renderRouter(routes, { initialUrl: "/study/session?lists=3" });
    await act(async () => {});

    await act(async () => fireEvent.press(screen.getByLabelText("Reveal answer")));
    await act(async () => fireEvent.press(screen.getByLabelText("Again")));
    expect(screen.getByText("2 / 2")).toBeTruthy();

    await act(async () => fireEvent.press(screen.getByLabelText("Reveal answer")));
    await act(async () => fireEvent.press(screen.getByLabelText("Again")));
    expect(screen.getByText("Session complete")).toBeTruthy();
  });

  it("says so when there is nothing to study", async () => {
    srs.buildSession.mockResolvedValue([]);
    renderRouter(routes, { initialUrl: "/study/session?lists=3" });
    await act(async () => {});
    expect(screen.getByText("Nothing to study")).toBeTruthy();
    expect(stats.recordSessionStart).not.toHaveBeenCalled();
  });

  it("marks a word known from the corner menu and moves on", async () => {
    srs.buildSession.mockResolvedValue([newCard(1), newCard(2)]);
    srs.suspendCard.mockResolvedValue(undefined);
    renderRouter(routes, { initialUrl: "/study/session?lists=3" });
    await act(async () => {});

    await act(async () => fireEvent.press(screen.getByLabelText("Card options")));
    await act(async () => fireEvent.press(screen.getByText("I already know this")));
    expect(srs.suspendCard).toHaveBeenCalledWith(1, 3);
    expect(screen.getByText("1 / 1")).toBeTruthy();
  });

  it("resolves every active list for a combined session", async () => {
    srs.getActiveLists.mockResolvedValue([active, { ...active, list: { ...active.list, id: 9 } }]);
    srs.buildSession.mockResolvedValue([]);
    renderRouter(routes, { initialUrl: "/study/session?lists=all" });
    await act(async () => {});
    expect(srs.buildSession).toHaveBeenCalledWith([3, 9], 20);
  });
});
