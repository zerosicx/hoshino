import { ActivityIndicator, FlatList, Text } from "react-native";
import { router } from "expo-router";
import { renderRouter, screen, act, fireEvent } from "expo-router/testing-library";
import ListDetail from "@/app/(tabs)/lists/[id]";
import WordDetail from "@/app/word/[id]";
import KanjiDetail from "@/app/kanji/[char]";
import type { DictionaryEntry, KanjiEntry } from "@/types/dictionary";
import type { ListSummary } from "@/types/lists";

jest.mock("@/services/lists");
jest.mock("@/services/dictionary");
jest.mock("@/utils/confirm");

const lists = jest.requireMock("@/services/lists");
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
  "word/[id]": WordDetail,
  "kanji/[char]": KanjiDetail,
};

describe("deleting a list", () => {
  afterEach(() => jest.resetAllMocks());

  /** Pushed from Lists, as in the app, so there is somewhere to go back to. */
  async function openList(summary: ListSummary) {
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
