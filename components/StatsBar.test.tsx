import { render, screen } from "@testing-library/react-native";
import StatsBar from "./StatsBar";

describe("StatsBar", () => {
  it("shows streak, learned today and reviewed today, and no accuracy", () => {
    render(<StatsBar stats={{ streak: 3, learnedToday: 8, reviewedToday: 12 }} />);
    expect(screen.getByText("Day streak")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("Learned today")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("Reviewed today")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.queryByText(/Accuracy|%/)).toBeNull();
  });

  it("reads as zeros before anything has loaded", () => {
    render(<StatsBar stats={null} />);
    expect(screen.getAllByText("0")).toHaveLength(3);
  });
});
