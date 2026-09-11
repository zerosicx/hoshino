import { describe, expect, it } from "vitest";
import {
  alignFurigana,
  annotateSentence,
  kanjiRunReadings,
  rubyText,
  splitCompounds,
  splitKanjiRun,
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

  // B6: the okurigana also occurs inside the kanji's own reading, so the first
  // occurrence is the wrong anchor. A trailing kana run belongs at the end.
  it.each([
    ["痛い", "いたい", "痛", "いた", "い"],
    ["可愛い", "かわいい", "可愛", "かわい", "い"],
    ["五つ", "いつつ", "五", "いつ", "つ"],
    ["疑う", "うたがう", "疑", "うたが", "う"],
  ])("anchors the trailing kana of %s at the end of the reading", (word, reading, kanji, kanjiReading, tail) => {
    expect(alignFurigana(word, reading)).toEqual([
      { base: kanji, reading: kanjiReading },
      { base: tail, reading: "" },
    ]);
  });

  // B6: a kanji run reads as at least one kana, so an anchor found at the
  // cursor itself is inside that run, not after it. 言 is い, not silent.
  it("never gives a kanji run an empty reading", () => {
    expect(alignFurigana("言い訳", "いいわけ")).toEqual([
      { base: "言", reading: "い" },
      { base: "い", reading: "" },
      { base: "訳", reading: "わけ" },
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

// KANJIDIC readings as the dictionary stores them: katakana on, kun with the
// okurigana after a dot and a hyphen where the kanji is a suffix.
const readings = new Map<string, string[]>([
  ["学", ["ガク", "まな.ぶ"]],
  ["校", ["コウ", "キョウ"]],
  ["図", ["ズ", "ト", "はか.る"]],
  ["書", ["ショ", "か.く"]],
  ["館", ["カン", "やかた"]],
  ["新", ["シン", "あたら.しい"]],
  ["聞", ["ブン", "モン", "き.く"]],
  ["出", ["シュツ", "スイ", "で.る", "だ.す"]],
  ["発", ["ハツ", "ホツ", "た.つ"]],
  ["三", ["サン", "み", "み.つ", "みっ.つ"]],
  ["日", ["ニチ", "ジツ", "ひ", "-び", "-か"]],
  ["本", ["ホン", "もと"]],
  ["大", ["ダイ", "タイ", "おお"]],
  ["人", ["ジン", "ニン", "ひと"]],
  ["合", ["ゴウ", "あ.う", "あい"]],
  ["気", ["キ", "ケ"]],
  ["道", ["ドウ", "みち"]],
  ["勉", ["ベン"]],
  ["強", ["キョウ", "つよ.い"]],
]);

describe("splitKanjiRun", () => {
  it("gives each kanji its own reading", () => {
    expect(splitKanjiRun("図書館", "としょかん", readings)).toEqual([
      "と",
      "しょ",
      "かん",
    ]);
  });

  it("allows a voiced first consonant after the first kanji", () => {
    expect(splitKanjiRun("新聞", "しんぶん", readings)).toEqual(["しん", "ぶん"]);
  });

  it("allows a reading to end in a small tsu before another kanji", () => {
    expect(splitKanjiRun("学校", "がっこう", readings)).toEqual(["がっ", "こう"]);
    expect(splitKanjiRun("三日", "みっか", readings)).toEqual(["みっ", "か"]);
  });

  it("allows both changes in one reading", () => {
    expect(splitKanjiRun("出発", "しゅっぱつ", readings)).toEqual([
      "しゅっ",
      "ぱつ",
    ]);
  });

  it("prefers the longest reading when a split is ambiguous", () => {
    // あ|いき|どう would also fit; あい is the reading anyone would write.
    expect(splitKanjiRun("合気道", "あいきどう", readings)).toEqual([
      "あい",
      "き",
      "どう",
    ]);
  });

  it("refuses rather than guesses when a kanji has no listed reading that fits", () => {
    expect(splitKanjiRun("大人", "おとな", readings)).toBeNull();
    // 日 is read に here and nowhere in KANJIDIC.
    expect(splitKanjiRun("日本", "にほん", readings)).toBeNull();
  });

  it("refuses when a kanji is unknown", () => {
    expect(splitKanjiRun("学級", "がっきゅう", readings)).toBeNull();
  });
});

describe("splitCompounds", () => {
  it("splits the multi-kanji pairs and leaves the rest alone", () => {
    expect(
      splitCompounds(alignFurigana("勉強する", "べんきょうする"), readings)
    ).toEqual([
      { base: "勉", reading: "べん" },
      { base: "強", reading: "きょう" },
      { base: "する", reading: "" },
    ]);
  });

  it("keeps the whole-run reading when a run cannot be split", () => {
    expect(splitCompounds(alignFurigana("大人", "おとな"), readings)).toEqual([
      { base: "大人", reading: "おとな" },
    ]);
  });
});

describe("rubyText", () => {
  it("shows the kana reading over kanji", () => {
    expect(rubyText({ base: "食", reading: "た" }, false)).toBe("た");
  });

  it("transliterates that reading in romaji mode", () => {
    expect(rubyText({ base: "食", reading: "た" }, true)).toBe("ta");
  });

  it("leaves kana bare for a reader of Japanese", () => {
    expect(rubyText({ base: "べる", reading: "" }, false)).toBe("");
  });

  // A beginner on romaji cannot read きれい any more than 綺麗.
  it.each([
    ["べる", "beru"],
    ["きれい", "kirei"],
    ["コーヒー", "koohii"],
  ])("transliterates bare kana '%s' in romaji mode", (base, expected) => {
    expect(rubyText({ base, reading: "" }, true)).toBe(expected);
  });

  it("leaves unreadable kanji bare rather than echoing it", () => {
    // An unannotated kanji run has no reading to show, and repeating the kanji
    // above itself would be noise.
    expect(rubyText({ base: "曜", reading: "" }, true)).toBe("");
  });

  it("leaves punctuation alone", () => {
    expect(rubyText({ base: "、", reading: "" }, true)).toBe("");
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
