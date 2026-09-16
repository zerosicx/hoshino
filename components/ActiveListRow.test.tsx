import { render, screen, fireEvent } from "@testing-library/react-native";
import ActiveListRow, { progressSummary } from "./ActiveListRow";
import type { ActiveList } from "@/types/study";

const item: ActiveList = {
  list: {
    id: 3,
    name: "Verbs",
    type: "custom",
    jlptLevel: null,
    starred: false,
    itemCount: 40,
    lastActivity: "2026-01-01T00:00:00.000Z",
  },
  progress: {
    listId: 3,
    total: 40,
    newCount: 20,
    learning: 5,
    familiar: 2,
    known: 1,
    mastered: 10,
    due: 7,
    suspended: 2,
  },
};

function renderRow(over: Partial<ActiveList["progress"]> = {}) {
  const onPress = jest.fn();
  const onReview = jest.fn();
  render(
    <ActiveListRow
      item={{ ...item, progress: { ...item.progress, ...over } }}
      pile={20}
      onPress={onPress}
      onReview={onReview}
    />
  );
  return { onPress, onReview };
}

describe("progressSummary", () => {
  it("walks down the ladder and skips zeros", () => {
    expect(progressSummary(item.progress)).toBe(
      "10 mastered · 1 known · 2 familiar · 5 learning · 20 new · 2 marked known"
    );
    expect(progressSummary({ ...item.progress, mastered: 0, known: 0, suspended: 0 })).toBe(
      "2 familiar · 5 learning · 20 new"
    );
  });
});

describe("ActiveListRow", () => {
  it("shows the name, the summary and the due pill", () => {
    renderRow();
    expect(screen.getByText("Verbs")).toBeTruthy();
    expect(screen.getByText("7 due")).toBeTruthy();
  });

  it("never shows more than one session's worth in the pill", () => {
    renderRow({ due: 340 });
    expect(screen.getByText("20 due")).toBeTruthy();
    expect(screen.queryByText(/340/)).toBeNull();
  });

  it("has no pill and no Review when nothing is due", () => {
    renderRow({ due: 0 });
    expect(screen.queryByText(/due/)).toBeNull();
    expect(screen.queryByLabelText("Review Verbs")).toBeNull();
  });

  it("starts a mixed session from the row and a review-only one from Review", () => {
    const { onPress, onReview } = renderRow();
    fireEvent.press(screen.getByLabelText("Review Verbs"));
    expect(onReview).toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Verbs"));
    expect(onPress).toHaveBeenCalled();
  });
});
