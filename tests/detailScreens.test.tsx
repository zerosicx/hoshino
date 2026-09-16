import { ActivityIndicator, FlatList, Text } from "react-native";
import { router } from "expo-router";
import { renderRouter, screen, act, fireEvent } from "expo-router/testing-library";
import ListDetail from "@/app/(tabs)/lists/[id]";
import WordDetail from "@/app/word/[id]";
import KanjiDetail from "@/app/kanji/[char]";
import type { DictionaryEntry, KanjiEntry, SearchResult } from "@/types/dictionary";
import type { ListSummary } from "@/types/lists";
import type { ListProgress, StudyCard } from "@/types/study";

jest.mock("@/services/lists");
jest.mock("@/services/dictionary");
jest.mock("@/services/srs");
jest.mock("@/utils/confirm");

const lists = jest.requireMock("@/services/lists");
const srs = jest.requireMock("@/services/srs");
const dictionary = jest.requireMock("@/services/dictionary");
const confirm = jest.requireMock("@/utils/confirm");

/** A promise the test resolves by hand, so the loading state can be inspected. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const list: ListSummary = {
  id: 5,
  name: "Verbs",
  type: "custom",
  jlptLevel: null,
  starred: false,
  itemCount: 0,
  lastActivity: "2024-01-01T00:00:00.000Z",
};

const entry: DictionaryEntry = {
  id: 1,
  kanjiForms: ["食べる"],
  readingForms: ["たべる"],
  senses: [{ glosses: ["to eat"], pos: [], misc: [], info: [] }],
  jlptLevel: 5,
  isCommon: true,
  tags: [],
  wordClass: null,
  furigana: [
    { base: "食", reading: "た" },
    { base: "べる", reading: "" },
  ],
};

const kanji: KanjiEntry = {
  character: "日",
  meanings: ["day", "sun"],
  onReadings: [],
  kunReadings: [],
  jlptLevel: 5,
  grade: 1,
  strokeCount: 4,
  radicals: [],
  frequency: 1,
};

const routes = {
  "(tabs)/lists/index": () => <Text>lists</Text>,
  "(tabs)/lists/[id]": ListDetail,
  "(tabs)/study/session": () => <Text>session</Text>,
  "word/[id]": WordDetail,
  "kanji/[char]": KanjiDetail,
};

describe("deleting a list", () => {
  afterEach(() => jest.resetAllMocks());

  /** Pushed from Lists, as in the app, so there is somewhere to go back to. */
  async function openList(summary: ListSummary) {
    srs.getSuspendedCount.mockResolvedValue(0);
    srs.getProgress.mockResolvedValue(new Map());
    srs.getListCards.mockResolvedValue(new Map());
    lists.getList.mockResolvedValue(summary);
    lists.getListEntries.mockResolvedValue([]);
    lists.getListKanji.mockResolvedValue([]);
    renderRouter(routes, { initialUrl: "/lists" });
    await act(async () => router.push(`/lists/${summary.id}`));
  }

  it("asks by name, then deletes and returns to Lists", async () => {
    confirm.confirmDestructive.mockResolvedValue(true);
    lists.deleteList.mockResolvedValue(undefined);
    await openList({ ...list, itemCount: 12 });

    await act(async () => fireEvent.press(screen.getByLabelText("Delete list")));

    expect(confirm.confirmDestructive).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Delete Verbs?", action: "Delete" })
    );
    expect(lists.deleteList).toHaveBeenCalledWith(5);
    expect(screen).toHavePathname("/lists");
  });

  it("does nothing when the deletion is not confirmed", async () => {
    confirm.confirmDestructive.mockResolvedValue(false);
    await openList(list);

    await act(async () => fireEvent.press(screen.getByLabelText("Delete list")));

    expect(lists.deleteList).not.toHaveBeenCalled();
    expect(screen).toHavePathname("/lists/5");
  });

  it("offers no delete on Searched Terms", async () => {
    await openList({ ...list, id: 1, name: "Searched Terms", type: "system" });
    expect(screen.getByText("Searched Terms")).toBeTruthy();
    expect(screen.queryByLabelText("Delete list")).toBeNull();
  });

  it("offers no delete on a JLPT list", async () => {
    await openList({ ...list, id: 3, name: "N5 Kanji", type: "jlpt_kanji", jlptLevel: 5 });
    expect(screen.getByText("N5 Kanji")).toBeTruthy();
    expect(screen.queryByLabelText("Delete list")).toBeNull();
  });
});

// Every detail screen mounts fresh on each visit, so a spinner-then-content
// swap would show on every navigation. The frame has to paint first and the
// body fill in underneath it.
describe("detail screens while loading", () => {
  beforeEach(() => {
    srs.getSuspendedCount.mockResolvedValue(0);
    srs.getProgress.mockResolvedValue(new Map());
    srs.getListCards.mockResolvedValue(new Map());
  });
  afterEach(() => jest.resetAllMocks());

  it("list: shows the frame with no spinner or empty state, then the list", async () => {
    const pending = deferred<ListSummary>();
    lists.getList.mockReturnValue(pending.promise);
    lists.getListEntries.mockResolvedValue([]);

    renderRouter(routes, { initialUrl: "/lists/5" });

    expect(screen.getByText("Back")).toBeTruthy();
    expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    expect(screen.queryByText(/Nothing here yet/)).toBeNull();
    expect(screen.queryByText("List not found")).toBeNull();

    await act(async () => pending.resolve(list));

    expect(screen.getByText("Verbs")).toBeTruthy();
    expect(screen.getByText(/Nothing here yet/)).toBeTruthy();
  });

  it("list: says so only once it is known to be missing", async () => {
    const pending = deferred<ListSummary | null>();
    lists.getList.mockReturnValue(pending.promise);

    renderRouter(routes, { initialUrl: "/lists/404" });
    expect(screen.queryByText("List not found")).toBeNull();

    await act(async () => pending.resolve(null));
    expect(screen.getByText("List not found")).toBeTruthy();
  });

  // B11: a 5-column grid made the short last row's cells grow to fill it.
  // B8: RN throws if a live FlatList's numColumns changes, so no list uses it.
  it("list: renders a JLPT kanji list as single-column rows", async () => {
    lists.getList.mockResolvedValue({
      ...list,
      id: 3,
      name: "N5 Kanji",
      type: "jlpt_kanji",
      jlptLevel: 5,
    });
    lists.getListKanji.mockResolvedValue([kanji]);

    renderRouter(routes, { initialUrl: "/lists/3" });
    await act(async () => {});

    expect(screen.getByText("日")).toBeTruthy();
    expect(screen.getByText("day, sun")).toBeTruthy();
    expect(screen.UNSAFE_getByType(FlatList).props.numColumns).toBeUndefined();
  });

  it("word: shows the frame with no spinner, then the entry", async () => {
    const pending = deferred<DictionaryEntry>();
    dictionary.getEntry.mockReturnValue(pending.promise);
    dictionary.getExamples.mockResolvedValue([]);
    dictionary.recordSearch.mockResolvedValue(undefined);

    renderRouter(routes, { initialUrl: "/word/1" });

    expect(screen.getByText("Back")).toBeTruthy();
    expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    expect(screen.queryByText("Entry not found")).toBeNull();

    await act(async () => pending.resolve(entry));

    expect(screen.getByText("to eat")).toBeTruthy();
  });

  it("kanji: shows the frame with no spinner, then the kanji", async () => {
    const pending = deferred<KanjiEntry>();
    dictionary.getKanji.mockReturnValue(pending.promise);

    renderRouter(routes, { initialUrl: "/kanji/日" });

    expect(screen.getByText("Back")).toBeTruthy();
    expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    expect(screen.queryByText(/not found/)).toBeNull();

    await act(async () => pending.resolve(kanji));

    expect(screen.getByText("day, sun")).toBeTruthy();
  });
});

describe("study controls on a list page", () => {
  const word: SearchResult = {
    id: 1,
    kanjiForm: "食べる",
    readingForm: "たべる",
    primaryMeaning: "to eat",
    jlptLevel: 5,
    isCommon: true,
    pos: [],
  };
  const other: SearchResult = { ...word, id: 2, kanjiForm: "飲む", readingForm: "のむ", primaryMeaning: "to drink" };

  const progress = (due: number): ListProgress => ({
    listId: 5,
    total: 2,
    newCount: 1,
    learning: 0,
    familiar: 1,
    known: 0,
    mastered: 0,
    due,
    suspended: 0,
  });

  const familiar: StudyCard = {
    entryId: 1,
    listId: 5,
    suspended: false,
    card: {
      due: new Date(),
      stability: 3,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 3,
      reps: 2,
      lapses: 0,
      state: 2,
    },
  };

  async function openStudied(due: number, cards: Map<number, StudyCard>) {
    lists.getList.mockResolvedValue({ ...list, itemCount: 2 });
    lists.getListEntries.mockResolvedValue([word, other]);
    srs.getSuspendedCount.mockResolvedValue(0);
    srs.getProgress.mockResolvedValue(new Map([[5, progress(due)]]));
    srs.getListCards.mockResolvedValue(cards);
    renderRouter(routes, { initialUrl: "/lists/5" });
    await act(async () => {});
  }

  afterEach(() => jest.resetAllMocks());

  it("shows the progress line, a stage beside each word, and Review when cards are due", async () => {
    await openStudied(1, new Map([[1, familiar]]));

    expect(screen.getByText("1 familiar · 1 new")).toBeTruthy();
    expect(screen.getByText("Familiar")).toBeTruthy();
    expect(screen.getByText("New")).toBeTruthy();

    await act(async () => fireEvent.press(screen.getByLabelText("Review this list")));
    expect(screen).toHavePathname("/study/session");
    expect(screen).toHaveSearchParams({ lists: "5", mode: "review" });
  });

  it("offers Study alone when nothing is due, and no stages before the list is studied", async () => {
    await openStudied(0, new Map());

    expect(screen.queryByLabelText("Review this list")).toBeNull();
    expect(screen.queryByText("New")).toBeNull();
    expect(screen.queryByText(/familiar/)).toBeNull();

    await act(async () => fireEvent.press(screen.getByLabelText("Study this list")));
    expect(screen).toHaveSearchParams({ lists: "5", mode: "mixed" });
  });
});
