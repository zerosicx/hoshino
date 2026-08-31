import { describe, expect, it } from "vitest";
import { deinflect } from "@/utils/deinflect";

/**
 * Deinflection only has to produce a superset containing the real dictionary
 * form — the dictionary lookup discards the rest — so these tests assert
 * containment rather than an exact candidate list.
 */
describe("deinflect", () => {
  it.each([
    ["食べます", "食べる"],
    ["食べました", "食べる"],
    ["食べません", "食べる"],
    ["食べた", "食べる"],
    ["食べて", "食べる"],
    ["食べない", "食べる"],
    ["食べなかった", "食べる"],
    ["食べたい", "食べる"],
    ["食べられる", "食べる"],
    ["食べれば", "食べる"],
    ["見ました", "見る"],
    ["見ない", "見る"],
  ])("ichidan: %s -> %s", (input, expected) => {
    expect(deinflect(input)).toContain(expected);
  });

  it.each([
    ["飲みたい", "飲む"],
    ["飲みます", "飲む"],
    ["飲んだ", "飲む"],
    ["飲んで", "飲む"],
    ["買わない", "買う"],
    ["買います", "買う"],
    ["買った", "買う"],
    ["走って", "走る"],
    ["走った", "走る"],
    ["走ります", "走る"],
    ["書いた", "書く"],
    ["書いて", "書く"],
    ["話した", "話す"],
    ["泳いだ", "泳ぐ"],
    ["死んだ", "死ぬ"],
    ["待った", "待つ"],
  ])("godan: %s -> %s", (input, expected) => {
    expect(deinflect(input)).toContain(expected);
  });

  it.each([
    ["行った", "行く"],
    ["行って", "行く"],
    ["しました", "する"],
    ["しません", "する"],
    ["した", "する"],
    ["して", "する"],
    ["きました", "来る"],
  ])("irregular: %s -> %s", (input, expected) => {
    expect(deinflect(input)).toContain(expected);
  });

  it.each([
    ["美しくない", "美しい"],
    ["高かった", "高い"],
    ["高くない", "高い"],
    ["安くて", "安い"],
    ["寒ければ", "寒い"],
  ])("i-adjective: %s -> %s", (input, expected) => {
    expect(deinflect(input)).toContain(expected);
  });

  it("handles stacked inflections", () => {
    expect(deinflect("食べたくない")).toContain("食べる");
    expect(deinflect("食べたかった")).toContain("食べる");
  });

  it("never returns the input itself", () => {
    expect(deinflect("食べる")).not.toContain("食べる");
  });

  it("returns nothing useful for a dictionary form it cannot strip", () => {
    expect(deinflect("水")).toEqual([]);
  });
});
