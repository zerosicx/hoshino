import { render, screen } from "@testing-library/react-native";
import ExampleSentences, { exampleRowClass } from "./ExampleSentences";
import type { ExampleSentence } from "@/types/dictionary";

const example = (id: number, english: string): ExampleSentence => ({
  id,
  japanese: "食べる",
  english,
  tokens: [],
  furigana: [{ base: "食", reading: "た" }, { base: "べる", reading: "" }],
});

describe("ExampleSentences", () => {
  // NativeWind has no `last:` variant — it compiled to an unconditional rule
  // that removed every divider — so the last row is decided by index.
  it("puts a divider under every example except the last", () => {
    expect(exampleRowClass(0, 3)).toContain("border-b");
    expect(exampleRowClass(1, 3)).toContain("border-b");
    expect(exampleRowClass(2, 3)).not.toContain("border-b");
  });

  it("gives the last example no trailing gap", () => {
    expect(exampleRowClass(2, 3)).toBe("");
  });

  it("renders every example under the heading", () => {
    render(
      <ExampleSentences
        examples={[example(1, "I eat."), example(2, "I ate.")]}
        readingMode="furigana"
      />
    );
    expect(screen.getByText("Examples")).toBeTruthy();
    expect(screen.getByText("I eat.")).toBeTruthy();
    expect(screen.getByText("I ate.")).toBeTruthy();
  });

  it("renders nothing when there are no examples", () => {
    render(<ExampleSentences examples={[]} readingMode="furigana" />);
    expect(screen.queryByText("Examples")).toBeNull();
  });
});
