import { render, screen, fireEvent } from "@testing-library/react-native";
import WordDetail, { kanjiIn } from "./WordDetail";
import type { DictionaryEntry } from "@/types/dictionary";

const entry: DictionaryEntry = {
  id: 1,
  kanjiForms: ["食べる"],
  readingForms: ["たべる"],
  senses: [
    { glosses: ["to eat"], pos: ["Ichidan verb", "transitive verb"], misc: [], info: [] },
    { glosses: ["to live on"], pos: [], misc: [], info: ["e.g. a salary"] },
  ],
  jlptLevel: 5,
  isCommon: true,
  tags: [],
  wordClass: null,
  furigana: [
    { base: "食", reading: "た" },
    { base: "べる", reading: "" },
  ],
};

describe("kanjiIn", () => {
  it("keeps each kanji once, in order, and drops kana", () => {
    expect(kanjiIn("食べる")).toEqual(["食"]);
    expect(kanjiIn("日曜日")).toEqual(["日", "曜"]);
    expect(kanjiIn("たべる")).toEqual([]);
  });
});

describe("WordDetail", () => {
  it("renders the meanings in order with their notes", () => {
    render(<WordDetail entry={entry} examples={[]} readingMode="furigana" />);

    expect(screen.getByText("to eat")).toBeTruthy();
    expect(screen.getByText("Ichidan verb, transitive verb")).toBeTruthy();
    expect(screen.getByText("to live on")).toBeTruthy();
    expect(screen.getByText("e.g. a salary")).toBeTruthy();
    expect(screen.getByText("Common")).toBeTruthy();
  });

  it("reports which kanji was tapped", () => {
    const onPressKanji = jest.fn();
    render(
      <WordDetail
        entry={entry}
        examples={[]}
        readingMode="furigana"
        onPressKanji={onPressKanji}
      />
    );

    fireEvent.press(screen.getByLabelText("Kanji 食"));
    expect(onPressKanji).toHaveBeenCalledWith("食");
  });

  it("has no kanji section for a word written in kana", () => {
    render(
      <WordDetail
        entry={{ ...entry, kanjiForms: [], furigana: [{ base: "たべる", reading: "" }] }}
        examples={[]}
        readingMode="furigana"
      />
    );

    expect(screen.queryByText("Kanji")).toBeNull();
  });
});
