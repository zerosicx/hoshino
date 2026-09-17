import { render, screen, fireEvent } from "@testing-library/react-native";
import ReaderText from "./ReaderText";
import type { ReaderToken } from "@/types/reader";

const tokens: ReaderToken[] = [
  { text: "私", entryId: 1, furigana: [{ base: "私", reading: "わたし" }], visited: false, searchable: false },
  { text: "は", entryId: null, furigana: [{ base: "は", reading: "" }], visited: false, searchable: true },
  { text: "鰐鱏", entryId: null, furigana: [{ base: "鰐鱏", reading: "" }], visited: false, searchable: true },
  { text: "食べた。", entryId: 2, furigana: [{ base: "食", reading: "た" }, { base: "べた。", reading: "" }], visited: true, searchable: false },
  { text: "2026", entryId: null, furigana: [{ base: "2026", reading: "" }], visited: false, searchable: false },
];

describe("ReaderText", () => {
  it("shows the paragraph plain until its words are known", () => {
    render(
      <ReaderText tokens={null} plain="私は食べた。" readingMode="furigana" onPressWord={jest.fn()} onPressUnknown={jest.fn()} />
    );
    expect(screen.getByText("私は食べた。")).toBeTruthy();
  });

  it("opens a known word and sends unknown Japanese to search", () => {
    const onPressWord = jest.fn();
    const onPressUnknown = jest.fn();
    render(
      <ReaderText tokens={tokens} plain="" readingMode="furigana" onPressWord={onPressWord} onPressUnknown={onPressUnknown} />
    );

    fireEvent.press(screen.getByLabelText("私、わたし"));
    expect(onPressWord).toHaveBeenCalledWith(1);

    fireEvent.press(screen.getByLabelText("鰐鱏、search"));
    expect(onPressUnknown).toHaveBeenCalledWith("鰐鱏");

    // Digits are neither a word nor worth searching.
    expect(screen.queryByLabelText(/2026/)).toBeNull();
    expect(screen.getByText("2026")).toBeTruthy();
  });

  it("puts the reading over the kanji only, and hides it when readings are off", () => {
    render(
      <ReaderText tokens={tokens} plain="" readingMode="furigana" onPressWord={jest.fn()} onPressUnknown={jest.fn()} />
    );
    expect(screen.getByText("わたし")).toBeTruthy();
    expect(screen.getByText("た")).toBeTruthy();

    screen.unmount();
    render(
      <ReaderText tokens={tokens} plain="" readingMode="none" onPressWord={jest.fn()} onPressUnknown={jest.fn()} />
    );
    expect(screen.queryByText("わたし")).toBeNull();
  });

  it("shows romaji in romaji mode", () => {
    render(
      <ReaderText tokens={tokens} plain="" readingMode="romaji" onPressWord={jest.fn()} onPressUnknown={jest.fn()} />
    );
    expect(screen.getByText("watashi")).toBeTruthy();
    expect(screen.queryByText("わたし")).toBeNull();
  });
});
