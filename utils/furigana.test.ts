import { describe, expect, it } from "vitest";
import {
  alignFurigana,
  annotateSentence,
  kanjiRunReadings,
} from "@/utils/furigana";

describe("alignFurigana", () => {
  it("puts the reading over the kanji only", () => {
    expect(alignFurigana("食べる", "たべる")).toEqual([
      { base: "食", reading: "た" },
      { base: "べる", reading: "" },
    ]);
  });

  it("splits a word with kanji at both ends", () => {
    expect(alignFurigana("食べ物", "たべもの")).toEqual([
      { base: "食", reading: "た" },
      { base: "べ", reading: "" },
      { base: "物", reading: "もの" },
    ]);
  });

  it("handles leading kana", () => {
    expect(alignFurigana("お茶", "おちゃ")).toEqual([
      { base: "お", reading: "" },
      { base: "茶", reading: "ちゃ" },
    ]);
  });

  it("handles a small tsu between kanji", () => {
    expect(alignFurigana("引っ越し", "ひっこし")).toEqual([
      { base: "引", reading: "ひ" },
      { base: "っ", reading: "" },
      { base: "越", reading: "こ" },
      { base: "し", reading: "" },
    ]);
  });

  it("keeps an unsplittable compound as one group", () => {
    expect(alignFurigana("水曜日", "すいようび")).toEqual([
      { base: "水曜日", reading: "すいようび" },
    ]);
  });

  it("annotates nothing for a kana-only word", () => {
    expect(alignFurigana("こーひー", "こーひー")).toEqual([
      { base: "こーひー", reading: "" },
    ]);
    expect(alignFurigana("コーヒー", "コーヒー")).toEqual([
      { base: "コーヒー", reading: "" },
    ]);
  });

  it("falls back to one group when the reading does not line up", () => {
    expect(alignFurigana("大人", "おとな")).toEqual([
      { base: "大人", reading: "おとな" },
    ]);
    expect(alignFurigana("今日", "きょう")).toEqual([
      { base: "今日", reading: "きょう" },
    ]);
  });

  it("returns nothing for an empty word", () => {
    expect(alignFurigana("", "")).toEqual([]);
  });
});

describe("kanjiRunReadings", () => {
  it("keys readings by their kanji run", () => {
    expect(kanjiRunReadings("食べ物", "たべもの")).toEqual(
      new Map([
        ["食", "た"],
        ["物", "もの"],
      ])
    );
  });

  it("skips kana runs", () => {
    expect(kanjiRunReadings("こーひー", "こーひー")).toEqual(new Map());
  });
});

describe("annotateSentence", () => {
  const readings = new Map([
    ["誕生日", "たんじょうび"],
    ["日", "ひ"],
    ["今日", "きょう"],
  ]);

  it("prefers the longest known run", () => {
    expect(annotateSentence("誕生日です", readings)).toEqual([
      { base: "誕生日", reading: "たんじょうび" },
      { base: "で", reading: "" },
      { base: "す", reading: "" },
    ]);
  });

  it("emits unannotated text one character at a time so it can wrap", () => {
    expect(annotateSentence("これは", readings)).toEqual([
      { base: "こ", reading: "" },
      { base: "れ", reading: "" },
      { base: "は", reading: "" },
    ]);
  });

  it("leaves unknown kanji bare rather than guessing", () => {
    expect(annotateSentence("猫だ", readings)).toEqual([
      { base: "猫", reading: "" },
      { base: "だ", reading: "" },
    ]);
  });

  it("annotates several runs in one sentence", () => {
    expect(annotateSentence("今日は誕生日", readings)).toEqual([
      { base: "今日", reading: "きょう" },
      { base: "は", reading: "" },
      { base: "誕生日", reading: "たんじょうび" },
    ]);
  });
});
