import { render, screen, fireEvent } from "@testing-library/react-native";
import DueTodayBar from "./DueTodayBar";

describe("DueTodayBar", () => {
  it("shows the pile and offers a review when cards are due", () => {
    const onStart = jest.fn();
    render(<DueTodayBar due={340} pile={20} onStart={onStart} />);
    expect(screen.getByText("20 cards ready")).toBeTruthy();
    expect(screen.getByText("Start Review")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Start review"));
    expect(onStart).toHaveBeenCalled();
  });

  it("keeps the copy short and offers new words when nothing is due", () => {
    render(<DueTodayBar due={0} pile={20} onStart={jest.fn()} />);
    expect(screen.getByText("Nothing due")).toBeTruthy();
    expect(screen.getByText("Learn New")).toBeTruthy();
    // The message is the only part allowed to give way on a narrow screen.
    expect(screen.getByText("Nothing due").props.numberOfLines).toBe(1);
  });
});
