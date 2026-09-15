import { render, screen } from "@testing-library/react-native";
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
    review: 3,
    mastered: 10,
    due: 7,
    suspended: 2,
  },
};

describe("progressSummary", () => {
  it("folds learning and review together and skips zeros", () => {
    expect(progressSummary(item.progress)).toBe("10 mastered · 8 learning · 20 new · 2 known");
    expect(progressSummary({ ...item.progress, mastered: 0, suspended: 0 })).toBe(
      "8 learning · 20 new"
    );
  });
});

describe("ActiveListRow", () => {
  it("shows the name, the summary and the due pill", () => {
    render(<ActiveListRow item={item} pile={20} onPress={jest.fn()} />);
    expect(screen.getByText("Verbs")).toBeTruthy();
    expect(screen.getByText("7 ready")).toBeTruthy();
  });

  it("never shows more than one pile in the pill", () => {
    render(
      <ActiveListRow item={{ ...item, progress: { ...item.progress, due: 340 } }} pile={20} onPress={jest.fn()} />
    );
    expect(screen.getByText("20 ready")).toBeTruthy();
  });

  it("has no pill when nothing is due", () => {
    render(
      <ActiveListRow item={{ ...item, progress: { ...item.progress, due: 0 } }} pile={20} onPress={jest.fn()} />
    );
    expect(screen.queryByText(/ready/)).toBeNull();
  });
});
