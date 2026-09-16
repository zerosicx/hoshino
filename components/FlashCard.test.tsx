import { render, screen, fireEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import FlashCard from "./FlashCard";
import type { CardContent } from "@/types/study";

const content: CardContent = {
  entry: {
    id: 1,
    kanjiForms: ["食べる"],
    readingForms: ["たべる"],
    senses: [{ glosses: ["to eat", "to live on"], pos: [], misc: [], info: [] }],
    jlptLevel: 5,
    isCommon: true,
    tags: [],
    wordClass: null,
    furigana: [
      { base: "食", reading: "た" },
      { base: "べる", reading: "" },
    ],
  },
  examples: [],
};

function renderCard(over: Partial<React.ComponentProps<typeof FlashCard>> = {}) {
  const props = {
    content,
    revealed: false,
    onReveal: jest.fn(),
    readingMode: "furigana" as const,
    cardFront: "kanji" as const,
    reduceMotion: true,
    onSeeMore: jest.fn(),
    onMarkKnown: jest.fn(),
    ...over,
  };
  // The corner menu is a BottomDrawer, which pads itself by the safe area.
  render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }}
    >
      <FlashCard {...props} />
    </SafeAreaProvider>
  );
  return props;
}

describe("FlashCard", () => {
  it("shows the word on the front and turns over on tap", () => {
    const props = renderCard();
    expect(screen.getByText("Tap to reveal")).toBeTruthy();
    expect(screen.queryByText("See full entry")).toBeNull();

    fireEvent.press(screen.getByLabelText("Reveal answer"));
    expect(props.onReveal).toHaveBeenCalled();
  });

  it("puts the meaning on the front when asked", () => {
    renderCard({ cardFront: "meaning" });
    expect(screen.getByText("to eat; to live on")).toBeTruthy();
  });

  it("shows the detail without conjugations on the back, with a way to the full page", () => {
    const props = renderCard({ revealed: true });
    expect(screen.getByText("Meanings")).toBeTruthy();
    expect(screen.queryByText("Conjugations")).toBeNull();

    fireEvent.press(screen.getByText("See full entry"));
    expect(props.onSeeMore).toHaveBeenCalled();
  });

  it("shows the mastery rung in the corner on both faces", () => {
    renderCard({ stage: "familiar" });
    expect(screen.getByText("Familiar")).toBeTruthy();
    screen.unmount();
    renderCard({ stage: "familiar", revealed: true });
    expect(screen.getByText("Familiar")).toBeTruthy();
    expect(screen.getByLabelText("Card options")).toBeTruthy();
  });

  it("shows no badge until the stage is known", () => {
    renderCard();
    expect(screen.queryByText(/New|Learning|Familiar|Known|Mastered/)).toBeNull();
  });

  it("marks a word as known only through the corner menu", () => {
    const props = renderCard();
    expect(screen.queryByText("I already know this")).toBeNull();

    fireEvent.press(screen.getByLabelText("Card options"));
    fireEvent.press(screen.getByText("I already know this"));
    expect(props.onMarkKnown).toHaveBeenCalled();
  });
});
