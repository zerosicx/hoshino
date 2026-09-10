import { fireEvent, render, screen } from "@testing-library/react-native";
import KanjiResultRow from "./KanjiResultRow";
import type { KanjiEntry } from "@/types/dictionary";

const kanji: KanjiEntry = {
  character: "日",
  meanings: ["day", "sun", "Japan"],
  onReadings: ["ニチ", "ジツ"],
  kunReadings: ["ひ", "-び"],
  jlptLevel: 5,
  grade: 1,
  strokeCount: 4,
  radicals: [],
  frequency: 1,
};

describe("KanjiResultRow", () => {
  it("shows the character, its meanings and both reading sets", () => {
    render(<KanjiResultRow item={kanji} onPress={() => {}} />);
    expect(screen.getByText("日")).toBeTruthy();
    expect(screen.getByText("day, sun, Japan")).toBeTruthy();
    expect(screen.getByText("ニチ、ジツ")).toBeTruthy();
    expect(screen.getByText("ひ、-び")).toBeTruthy();
    expect(screen.getByText("N5")).toBeTruthy();
  });

  it("leaves out a reading set the kanji does not have", () => {
    render(
      <KanjiResultRow
        item={{ ...kanji, onReadings: [], kunReadings: [] }}
        onPress={() => {}}
      />
    );
    expect(screen.queryByText("ニチ、ジツ")).toBeNull();
    expect(screen.queryByText("ひ、-び")).toBeNull();
  });

  it("reports a press", () => {
    const onPress = jest.fn();
    render(<KanjiResultRow item={kanji} onPress={onPress} />);
    fireEvent.press(screen.getByText("日"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
