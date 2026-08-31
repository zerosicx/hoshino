/**
 * Search quality benchmark.
 *
 * `expected` is the surface form (kanji or reading) that must appear on the
 * top-ranked result. Baseline answers were taken from jisho.org's API on
 * 2026-08-31; entries marked `deviation` are cases where we deliberately aim
 * to beat Jisho, with the reason recorded.
 */

export type Category =
  | "exact-kanji"
  | "exact-kana"
  | "katakana"
  | "conjugated-verb"
  | "conjugated-adjective"
  | "romaji"
  | "english"
  | "english-phrase";

export interface BenchmarkCase {
  query: string;
  expected: string;
  category: Category;
  /** Set when our target intentionally differs from Jisho's answer. */
  deviation?: string;
}

export const BENCHMARK: BenchmarkCase[] = [
  // --- The query is exactly a kanji form -----------------------------------
  { query: "水", expected: "水", category: "exact-kanji" },
  { query: "見る", expected: "見る", category: "exact-kanji" },
  { query: "食べる", expected: "食べる", category: "exact-kanji" },
  { query: "人", expected: "人", category: "exact-kanji" },
  { query: "日本語", expected: "日本語", category: "exact-kanji" },
  { query: "学校", expected: "学校", category: "exact-kanji" },
  { query: "本", expected: "本", category: "exact-kanji" },
  { query: "時間", expected: "時間", category: "exact-kanji" },
  { query: "高い", expected: "高い", category: "exact-kanji" },
  { query: "大きい", expected: "大きい", category: "exact-kanji" },

  // --- The query is exactly a reading --------------------------------------
  { query: "たべる", expected: "食べる", category: "exact-kana" },
  { query: "みず", expected: "水", category: "exact-kana" },
  { query: "ねこ", expected: "猫", category: "exact-kana" },
  { query: "ありがとう", expected: "有難う", category: "exact-kana" },

  // --- Katakana ------------------------------------------------------------
  { query: "コーヒー", expected: "珈琲", category: "katakana" },
  {
    query: "タベル",
    expected: "食べる",
    category: "katakana",
    deviation:
      "Jisho returns 'Tabersonine 16-hydroxylase'. A learner typing katakana " +
      "for a native verb wants 食べる, so we fold kana before matching.",
  },

  // --- Conjugated verbs ----------------------------------------------------
  { query: "食べます", expected: "食べる", category: "conjugated-verb" },
  { query: "食べた", expected: "食べる", category: "conjugated-verb" },
  {
    query: "食べて",
    expected: "食べる",
    category: "conjugated-verb",
    deviation:
      "Jisho returns two idioms containing 食べて and misses 食べる entirely.",
  },
  { query: "見ました", expected: "見る", category: "conjugated-verb" },
  {
    query: "行った",
    expected: "行く",
    category: "conjugated-verb",
    deviation:
      "Jisho returns 行ったり来たり. 行った is the plain past of 行く, which " +
      "is what a learner reading a sentence needs.",
  },
  { query: "飲みたい", expected: "飲む", category: "conjugated-verb" },
  { query: "走って", expected: "走る", category: "conjugated-verb" },
  { query: "買わない", expected: "買う", category: "conjugated-verb" },
  { query: "しました", expected: "する", category: "conjugated-verb" },

  // --- Conjugated adjectives -----------------------------------------------
  { query: "美しくない", expected: "美しい", category: "conjugated-adjective" },
  { query: "高かった", expected: "高い", category: "conjugated-adjective" },

  // --- Romaji --------------------------------------------------------------
  { query: "taberu", expected: "食べる", category: "romaji" },
  { query: "mizu", expected: "水", category: "romaji" },
  { query: "neko", expected: "猫", category: "romaji" },
  { query: "arigatou", expected: "有難う", category: "romaji" },
  { query: "tabemasu", expected: "食べる", category: "romaji" },

  // --- English -------------------------------------------------------------
  {
    query: "water",
    expected: "水",
    category: "english",
    deviation:
      "Jisho ranks 水分 (moisture content) first. 水 is the word a learner " +
      "searching 'water' means.",
  },
  { query: "eat", expected: "食べる", category: "english" },
  { query: "cat", expected: "猫", category: "english" },
  { query: "run", expected: "走る", category: "english" },
  { query: "beautiful", expected: "美しい", category: "english" },
  { query: "book", expected: "本", category: "english" },
  { query: "school", expected: "学校", category: "english" },
  { query: "teacher", expected: "先生", category: "english" },
  { query: "buy", expected: "買う", category: "english" },
  { query: "drink", expected: "飲み物", category: "english" },
  {
    query: "time",
    expected: "時間",
    category: "english",
    deviation:
      "Jisho converts 'time' to ちめ and returns 血眼 (bloodshot eyes). " +
      "We treat a non-romaji English word as English.",
  },

  // --- English phrases -----------------------------------------------------
  { query: "to eat", expected: "食べる", category: "english-phrase" },
  { query: "hot water", expected: "湯", category: "english-phrase" },
];
