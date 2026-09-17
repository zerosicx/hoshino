import { Text } from "react-native";
import { renderRouter, screen, act, fireEvent } from "expo-router/testing-library";
import DictionaryScreen from "@/app/(tabs)/dictionary/index";
import ReaderScreen, { SAMPLE_TEXT } from "@/app/(tabs)/dictionary/reader";
import { useReaderStore } from "@/stores/readerStore";
import { useSearchStore } from "@/stores/searchStore";
import type { ReaderToken } from "@/types/reader";

jest.mock("@/services/reader");
jest.mock("expo-clipboard", () => ({ getStringAsync: jest.fn() }));
jest.mock("@/services/dictionary");
jest.mock("@/services/lists");

const reader = jest.requireMock("@/services/reader");
const clipboard = jest.requireMock("expo-clipboard");
const dictionary = jest.requireMock("@/services/dictionary");
const lists = jest.requireMock("@/services/lists");

const routes = {
  "(tabs)/dictionary/index": DictionaryScreen,
  "(tabs)/dictionary/reader": ReaderScreen,
  "(tabs)/lists/[id]": () => <Text>list page</Text>,
  "word/[id]": () => <Text>word page</Text>,
};

/** Every kanji run becomes a word with id = its length; kana stays plain. */
function fakeTokens(text: string): ReaderToken[] {
  return [...text].map((ch) => {
    const kanji = /[一-鿿]/.test(ch);
    return {
      text: ch,
      entryId: kanji ? ch.codePointAt(0)! : null,
      furigana: [{ base: ch, reading: kanji ? "よみ" : "" }],
      visited: false,
      searchable: !kanji && /[ぁ-ゟ]/.test(ch),
    };
  });
}

beforeEach(() => {
  useReaderStore.setState({ text: "" });
  useSearchStore.setState({ query: "", recentSearches: [] });
  reader.readParagraph.mockImplementation(async (text: string) => fakeTokens(text));
  reader.refreshVisited.mockImplementation(async (t: ReaderToken[]) => t);
  dictionary.getRecentSearches.mockResolvedValue([]);
  dictionary.searchEntries.mockResolvedValue([]);
});

afterEach(() => jest.resetAllMocks());

describe("reader entry point", () => {
  it("offers Read a text on the Dictionary home, or Continue reading once there is text", async () => {
    renderRouter(routes, { initialUrl: "/dictionary" });
    await act(async () => {});
    expect(screen.getByText("Read a text")).toBeTruthy();

    await act(async () => useReaderStore.setState({ text: "昨日は雨だった。" }));
    expect(screen.getByText("Continue reading")).toBeTruthy();
    expect(screen.getByText("昨日は雨だった。")).toBeTruthy();

    await act(async () => fireEvent.press(screen.getByLabelText("Read a text")));
    expect(screen).toHavePathname("/dictionary/reader");
  });
});

describe("reader screen", () => {
  it("shows the sample live when nothing has been pasted, and reads a paste", async () => {
    renderRouter(routes, { initialUrl: "/dictionary/reader" });
    await act(async () => {});

    expect(screen.getByText("Try it: tap any word")).toBeTruthy();
    expect(reader.readParagraph).toHaveBeenCalledWith(SAMPLE_TEXT);

    fireEvent.changeText(screen.getByPlaceholderText(/Paste Japanese/), "猫が好き\n\n犬も好き");
    await act(async () => fireEvent.press(screen.getByLabelText("Read")));

    expect(useReaderStore.getState().text).toBe("猫が好き\n\n犬も好き");
    expect(reader.readParagraph).toHaveBeenCalledWith("猫が好き");
    expect(reader.readParagraph).toHaveBeenCalledWith("犬も好き");
    expect(screen.queryByText("Try it: tap any word")).toBeNull();
  });

  it("opens a word page from a word", async () => {
    useReaderStore.setState({ text: "猫が" });
    renderRouter(routes, { initialUrl: "/dictionary/reader" });
    await act(async () => {});

    await act(async () => fireEvent.press(screen.getByLabelText("猫、よみ")));
    expect(screen).toHavePathname(`/word/${"猫".codePointAt(0)}`);
  });

  it("sends unknown kana to search, prefilled, back on the Dictionary screen", async () => {
    useReaderStore.setState({ text: "猫が" });
    renderRouter(routes, { initialUrl: "/dictionary" });
    await act(async () => {});
    await act(async () => fireEvent.press(screen.getByLabelText("Read a text")));

    await act(async () => fireEvent.press(screen.getByLabelText("が、search")));
    expect(useSearchStore.getState().query).toBe("が");
    expect(screen).toHavePathname("/dictionary");
  });

  it("pastes the clipboard into the field, and straight into reading when already reading", async () => {
    clipboard.getStringAsync.mockResolvedValue("  昨日は雨。  ");
    renderRouter(routes, { initialUrl: "/dictionary/reader" });
    await act(async () => {});

    await act(async () => fireEvent.press(screen.getByLabelText("Paste")));
    expect(screen.getByPlaceholderText(/Paste Japanese/).props.value).toBe("昨日は雨。");

    await act(async () => fireEvent.press(screen.getByLabelText("Read")));
    clipboard.getStringAsync.mockResolvedValue("今日は晴れ。");
    await act(async () => fireEvent.press(screen.getByLabelText("Paste")));
    expect(useReaderStore.getState().text).toBe("今日は晴れ。");
    expect(reader.readParagraph).toHaveBeenCalledWith("今日は晴れ。");
  });

  it("goes back to the field with the text prefilled on Edit", async () => {
    useReaderStore.setState({ text: "猫が" });
    renderRouter(routes, { initialUrl: "/dictionary/reader" });
    await act(async () => {});

    await act(async () => fireEvent.press(screen.getByLabelText("Edit text")));
    expect(screen.getByPlaceholderText(/Paste Japanese/).props.value).toBe("猫が");
  });
});
