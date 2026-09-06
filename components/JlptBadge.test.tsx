import { render, screen } from "@testing-library/react-native";
import JlptBadge from "./JlptBadge";

describe("JlptBadge", () => {
  it("labels each JLPT level", () => {
    for (const level of [1, 2, 3, 4, 5]) {
      const { unmount } = render(<JlptBadge level={level} />);
      expect(screen.getByText(`N${level}`)).toBeTruthy();
      unmount();
    }
  });

  it("renders nothing without a level", () => {
    render(<JlptBadge level={null} />);
    expect(screen.queryByText(/^N/)).toBeNull();
  });

  // Entries carry whatever jlpt_level the dictionary holds, so a value outside
  // 1–5 has no colour to render and must not fall through to an unstyled badge.
  it("renders nothing for a level outside 1-5", () => {
    render(<JlptBadge level={6} />);
    expect(screen.queryByText(/^N/)).toBeNull();
  });
});
