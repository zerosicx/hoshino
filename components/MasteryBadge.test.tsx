import { render, screen } from "@testing-library/react-native";
import MasteryBadge, { STAGE_LABEL } from "./MasteryBadge";
import { STAGES } from "@/services/scheduler";

describe("MasteryBadge", () => {
  it("names the rung and fills the ladder up to it", () => {
    render(<MasteryBadge stage="familiar" />);
    expect(screen.getByText("Familiar")).toBeTruthy();
    expect(screen.getAllByTestId("rung-filled")).toHaveLength(3);
    expect(screen.getAllByTestId("rung-empty")).toHaveLength(2);
    expect(screen.getByLabelText("Familiar, 3 of 5")).toBeTruthy();
  });

  it("fills one dot for new and all five for mastered", () => {
    render(<MasteryBadge stage="new" />);
    expect(screen.getAllByTestId("rung-filled")).toHaveLength(1);
    screen.unmount();
    render(<MasteryBadge stage="mastered" />);
    expect(screen.getAllByTestId("rung-filled")).toHaveLength(5);
    expect(screen.queryAllByTestId("rung-empty")).toHaveLength(0);
  });

  it("drops the ladder when compact, keeping the name", () => {
    render(<MasteryBadge stage="known" compact />);
    expect(screen.getByText("Known")).toBeTruthy();
    expect(screen.queryByTestId("mastery-ladder")).toBeNull();
  });

  it("has a label for every rung", () => {
    for (const stage of STAGES) expect(STAGE_LABEL[stage]).toBeTruthy();
  });
});
