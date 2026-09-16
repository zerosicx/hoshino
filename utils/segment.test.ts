import { describe, expect, it } from "vitest";
import {
  candidates,
  furiganaFor,
  isLinkable,
  segment,
  type Lexicon,
  type LexiconEntry,
} from "@/utils/segment";

let nextId = 1;
function entry(forms: string[], readings: string[], common = true, kanaUsual = false): LexiconEntry {
  return { id: nextId++, forms, readings, common, kanaUsual };
}

/** A lexicon keyed the way the reader service keys the real one: every form and reading. */
function lexicon(entries: LexiconEntry[]): Lexicon {
  const map: Lexicon = new Map();
  for (const e of entries) {
    for (const term of [...e.forms, ...e.readings]) {
      map.set(term, [...(map.get(term) ?? []), e]);
    }
  }
  return map;
}

const words = lexicon([
  entry(["私"], ["わたし"]),
  entry(["日本語"], ["にほんご"]),
  entry(["日本"], ["にほん"]),
  entry(["語"], ["ご"], false),
  entry(["食べる"], ["たべる"]),
  entry(["猫"], ["ねこ"]),
  entry(["魚"], ["さかな"]),
  entry(["昨日"], ["きのう"]),
  entry(["新しい"], ["あたらしい"]),
  entry(["本"], ["ほん"]),
  entry(["買う"], ["かう"]),
  entry(["歯"], ["は"]),
  entry(["列"], ["れつ"]),
  entry(["為る"], ["する"], true, true),
  entry(["本の"], ["ほんの"]),
  entry(["日野菜"], ["ひのな"], false),
  entry(["毎日"], ["まいにち"]),
  entry(["野菜"], ["やさい"]),
  entry(["毎"], ["まい"]),
  entry(["日"], ["ひ"]),
  entry(["勉強"], ["べんきょう"]),
  entry(["東京"], ["とうきょう"]),
  entry(["コーヒー"], ["コーヒー"]),
]);

const texts = (segs: ReturnType<typeof segment>) => segs.map((s) => s.text);
const linked = (segs: ReturnType<typeof segment>) => segs.filter(isLinkable).map((s) => s.text);

describe("candidates", () => {
  it("offers every span up to the limit and deinflections for kana-ending ones", () => {
    const { terms } = candidates("食べた");
    expect(terms.has("食べた")).toBe(true);
    expect(terms.has("食べる")).toBe(true);
    expect(terms.has("食")).toBe(true);
  });

  it("never crosses punctuation, spaces or latin", () => {
    const { spans } = candidates("猫。魚");
    expect(spans.every((s) => s.end <= 1 || s.start >= 2)).toBe(true);
    expect(candidates("Tokyo 2026").spans).toHaveLength(0);
  });
});

describe("segment", () => {
  it("prefers the longest word: 日本語 over 日本 + 語", () => {
    expect(texts(segment("日本語", words))).toEqual(["日本語"]);
  });

  it("reads a plain sentence into words, leaving particles plain", () => {
    const segs = segment("私は猫が好き", words);
    expect(texts(segs)).toEqual(["私", "は", "猫", "が好き"]);
    expect(segs[1].entry).toBeUndefined();
    expect(segs[3].entry).toBeUndefined();
  });

  it("never reads a kana particle as the kanji word with that reading", () => {
    // は is not 歯; and a kana span may only be a kanji word that is usually kana.
    expect(linked(segment("猫は魚", words))).toEqual(["猫", "魚"]);
    expect(linked(segment("勉強する", words))).toEqual(["勉強", "する"]);
  });

  it("prefers two common words to one rare compound", () => {
    expect(texts(segment("毎日野菜", words))).toEqual(["毎日", "野菜"]);
  });

  it("gives a word-plus-particle entry back to the word", () => {
    expect(texts(segment("日本の本", words))).toEqual(["日本", "の", "本"]);
  });

  it("resolves a conjugated verb to its dictionary form, as one word", () => {
    const segs = segment("魚を食べた", words);
    expect(texts(segs)).toEqual(["魚", "を", "食べた"]);
    const verb = segs[2];
    expect(verb.term).toBe("食べる");
    expect(verb.deinflected).toBe(true);
    expect(verb.entry?.forms).toEqual(["食べる"]);
  });

  it("resolves a conjugated adjective", () => {
    const segs = segment("新しかった本", words);
    expect(texts(segs)).toEqual(["新しかった", "本"]);
    expect(segs[0].term).toBe("新しい");
  });

  it("does not split する away from its noun when the noun stands alone", () => {
    expect(texts(segment("勉強する", words))).toEqual(["勉強", "する"]);
  });

  it("keeps unknown runs together and never links them", () => {
    const segs = segment("東京2026年！猫", words);
    expect(texts(segs)).toEqual(["東京", "2026年！", "猫"]);
    expect(linked(segs)).toEqual(["東京", "猫"]);
  });

  it("lets katakana with a long-vowel mark be one word", () => {
    expect(texts(segment("コーヒーを買う", words))).toEqual(["コーヒー", "を", "買う"]);
  });

  it("links words but not lone kana particles", () => {
    expect(linked(segment("私は日本語を勉強する", words))).toEqual(["私", "日本語", "勉強", "する"]);
  });

  it("caps the span length", () => {
    const { spans } = candidates("ああああああああああああ");
    expect(Math.max(...spans.map((s) => s.end - s.start))).toBe(8);
  });

  it("returns nothing for empty text", () => {
    expect(segment("", words)).toEqual([]);
  });

  it("marks every character of a text the lexicon knows nothing about as one unknown run", () => {
    expect(texts(segment("鰐鱏", new Map()))).toEqual(["鰐鱏"]);
  });
});

describe("furiganaFor", () => {
  const taberu = entry(["食べる"], ["たべる"]);
  const atarashii = entry(["新しい"], ["あたらしい"]);
  const suru = entry(["する"], ["する"]);
  const nihongo = entry(["日本語"], ["にほんご"]);

  it("places the dictionary form's readings over a word as written", () => {
    expect(furiganaFor("食べる", "食べる", taberu)).toEqual([
      { base: "食", reading: "た" },
      { base: "べる", reading: "" },
    ]);
    expect(furiganaFor("日本語", "日本語", nihongo)).toEqual([{ base: "日本語", reading: "にほんご" }]);
  });

  it("keeps the kanji readings and leaves an inflected ending bare", () => {
    expect(furiganaFor("食べた", "食べる", taberu)).toEqual([
      { base: "食", reading: "た" },
      { base: "べた", reading: "" },
    ]);
    expect(furiganaFor("新しかった", "新しい", atarashii)).toEqual([
      { base: "新", reading: "あたら" },
      { base: "しかった", reading: "" },
    ]);
  });

  it("gives kana words and unknown text nothing to place", () => {
    expect(furiganaFor("する", "する", suru)).toEqual([{ base: "する", reading: "" }]);
    expect(furiganaFor("鰐", undefined, undefined)).toEqual([{ base: "鰐", reading: "" }]);
  });

  it("stays bare when the match was a reading, not a written form", () => {
    expect(furiganaFor("たべる", "たべる", taberu)).toEqual([{ base: "たべる", reading: "" }]);
  });
});
