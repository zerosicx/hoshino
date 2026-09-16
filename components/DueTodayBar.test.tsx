import { render, screen, fireEvent } from "@testing-library/react-native";
import DueTodayBar, { barMessage } from "./DueTodayBar";

function renderBar(preview: { due: number; fresh: number; budgetSpent: boolean }) {
  const handlers = { onStart: jest.fn(), onLearnMore: jest.fn(), onBrowse: jest.fn() };
  render(<DueTodayBar preview={preview} {...handlers} />);
  return handlers;
}

describe("barMessage", () => {
  it("names both parts, drops a zero part, and says when the day is done", () => {
    expect(barMessage({ due: 6, fresh: 4, budgetSpent: false })).toBe("6 due · 4 new");
    expect(barMessage({ due: 20, fresh: 0, budgetSpent: false })).toBe("20 due");
    expect(barMessage({ due: 0, fresh: 10, budgetSpent: false })).toBe("10 new");
    expect(barMessage({ due: 0, fresh: 0, budgetSpent: true })).toBe("Done for today");
    expect(barMessage({ due: 0, fresh: 0, budgetSpent: false })).toBe("Nothing due");
  });
});

describe("DueTodayBar", () => {
  it("says what the session holds and starts it", () => {
    const { onStart } = renderBar({ due: 6, fresh: 4, budgetSpent: false });
    expect(screen.getByText("6 due · 4 new")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Start"));
    expect(onStart).toHaveBeenCalled();
    // The message is the only part allowed to give way on a narrow screen.
    expect(screen.getByText("6 due · 4 new").props.numberOfLines).toBe(1);
  });

  it("offers to learn more once the budget is spent and nothing is due", () => {
    const { onLearnMore, onStart } = renderBar({ due: 0, fresh: 0, budgetSpent: true });
    expect(screen.getByText("Done for today")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Learn more"));
    expect(onLearnMore).toHaveBeenCalled();
    expect(onStart).not.toHaveBeenCalled();
  });

  it("points at the lists when there is nothing due and nothing new left", () => {
    const { onBrowse } = renderBar({ due: 0, fresh: 0, budgetSpent: false });
    expect(screen.getByText("Nothing due")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Browse lists"));
    expect(onBrowse).toHaveBeenCalled();
  });
});
