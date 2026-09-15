import { render, screen, fireEvent } from "@testing-library/react-native";
import SRSRatingBar from "./SRSRatingBar";
import { Rating } from "@/services/scheduler";

const intervals = {
  [Rating.Again]: "<1m",
  [Rating.Hard]: "6m",
  [Rating.Good]: "10m",
  [Rating.Easy]: "4d",
};

describe("SRSRatingBar", () => {
  it("shows the four grades with their next intervals", () => {
    render(<SRSRatingBar intervals={intervals} onRate={jest.fn()} />);
    for (const label of ["Again", "Hard", "Good", "Easy"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText("4d")).toBeTruthy();
  });

  it("reports the grade that was tapped", () => {
    const onRate = jest.fn();
    render(<SRSRatingBar intervals={intervals} onRate={onRate} />);
    fireEvent.press(screen.getByLabelText("Good"));
    expect(onRate).toHaveBeenCalledWith(Rating.Good);
  });
});
