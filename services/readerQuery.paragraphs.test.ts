import { describe, expect, it } from "vitest";
import { paragraphsOf } from "@/services/readerQuery";

describe("paragraphsOf", () => {
  it("splits on newlines and drops blank lines", () => {
    expect(paragraphsOf("一行目\n\n  二行目  \r\n三行目")).toEqual(["一行目", "二行目", "三行目"]);
  });

  it("breaks a run-on paragraph at sentence ends", () => {
    const sentence = "これは文です。";
    const long = sentence.repeat(10);
    const parts = paragraphsOf(long, 30);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join("")).toBe(long);
    for (const p of parts) expect(p.endsWith("。")).toBe(true);
  });

  it("leaves a sentence longer than the cap whole rather than cutting mid-word", () => {
    const long = "あ".repeat(50);
    expect(paragraphsOf(long, 30)).toEqual([long]);
  });
});
