import { describe, expect, it } from "vitest";
import {
  containsJapanese,
  isKanaOnly,
  kanaToRomaji,
  romajiToHiragana,
  toHiragana,
  toKatakana,
} from "@/utils/japanese";

describe("containsJapanese", () => {
  it.each(["水", "たべる", "コーヒー", "食べます"])("%s is Japanese", (s) => {
    expect(containsJapanese(s)).toBe(true);
  });

  it.each(["water", "taberu", "", "123"])("%s is not Japanese", (s) => {
    expect(containsJapanese(s)).toBe(false);
  });
});

describe("kana conversion", () => {
  it("folds katakana to hiragana", () => {
    expect(toHiragana("タベル")).toBe("たべる");
    expect(toHiragana("コーヒー")).toBe("こーひー");
  });

  it("folds hiragana to katakana", () => {
    expect(toKatakana("たべる")).toBe("タベル");
  });

  it("leaves kanji untouched", () => {
    expect(toHiragana("食べル")).toBe("食べる");
  });

  it("detects kana-only text", () => {
    expect(isKanaOnly("たべる")).toBe(true);
    expect(isKanaOnly("食べる")).toBe(false);
    expect(isKanaOnly("")).toBe(false);
  });
});

describe("romajiToHiragana", () => {
  it.each([
    ["taberu", "たべる"],
    ["mizu", "みず"],
    ["neko", "ねこ"],
    ["arigatou", "ありがとう"],
    ["tabemasu", "たべます"],
    ["shinbun", "しんぶん"],
    ["kitte", "きって"],
    ["hon", "ほん"],
    ["gakkou", "がっこう"],
    ["chotto", "ちょっと"],
  ])("converts %s", (romaji, kana) => {
    expect(romajiToHiragana(romaji)).toBe(kana);
  });

  it.each(["water", "cat", "beautiful", "school", "teacher", "book", "drink"])(
    "rejects the English word %s",
    (word) => {
      expect(romajiToHiragana(word)).toBeNull();
    }
  );

  it("rejects wapuro spellings that collide with English", () => {
    // "ti" would make "time" into ちめ, which is jisho.org's failure mode.
    expect(romajiToHiragana("time")).toBeNull();
  });

  it("rejects non-letters", () => {
    expect(romajiToHiragana("mizu1")).toBeNull();
    expect(romajiToHiragana("")).toBeNull();
  });
});

describe("kanaToRomaji", () => {
  it.each([
    ["たべる", "taberu"],
    ["みず", "mizu"],
    ["ねこ", "neko"],
    ["ありがとう", "arigatou"],
    ["ふじさん", "fujisan"],
  ])("converts %s", (kana, romaji) => {
    expect(kanaToRomaji(kana)).toBe(romaji);
  });

  it.each([
    ["きょう", "kyou"],
    ["しゃしん", "shashin"],
    ["りょこう", "ryokou"],
  ])("converts the contracted sound in %s", (kana, romaji) => {
    expect(kanaToRomaji(kana)).toBe(romaji);
  });

  it.each([
    ["きって", "kitte"],
    ["がっこう", "gakkou"],
    ["ちょっと", "chotto"],
    ["ざっし", "zasshi"],
    ["まっちゃ", "matcha"],
  ])("doubles the consonant after a small tsu in %s", (kana, romaji) => {
    expect(kanaToRomaji(kana)).toBe(romaji);
  });

  it.each([
    ["ほん", "hon"],
    ["しんぶん", "shinbun"],
  ])("writes n for %s", (kana, romaji) => {
    expect(kanaToRomaji(kana)).toBe(romaji);
  });

  it.each([
    ["しんゆう", "shin'yuu"],
    ["きんえん", "kin'en"],
  ])("separates n from a following vowel or y in %s", (kana, romaji) => {
    expect(kanaToRomaji(kana)).toBe(romaji);
  });

  it.each([
    ["コーヒー", "koohii"],
    ["テレビ", "terebi"],
    ["ラーメン", "raamen"],
  ])("converts katakana %s", (kana, romaji) => {
    expect(kanaToRomaji(kana)).toBe(romaji);
  });

  it("leaves characters it cannot read untouched", () => {
    expect(kanaToRomaji("")).toBe("");
    expect(kanaToRomaji("ABC")).toBe("ABC");
  });

  it("round-trips through romajiToHiragana", () => {
    for (const word of ["たべる", "がっこう", "しんぶん", "きょう", "みず"]) {
      expect(romajiToHiragana(kanaToRomaji(word))).toBe(word);
    }
  });
});
