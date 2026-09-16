/**
 * Segmentation quality benchmark.
 *
 * Each case is a sentence of ordinary Japanese and the words a reader should
 * be able to tap in it, in order. Particles, punctuation and endings are not
 * listed: they may be segmented however the algorithm likes, so long as every
 * listed word comes out as exactly one linkable segment. Auxiliaries after a
 * te-form (読んで|いた) split, as they do in every dictionary; an adverb or
 * expression the dictionary has as one entry (静かに, 依然として, 出て行く) is
 * one word. Scored on the share of listed words found.
 */

export interface SegmentCase {
  text: string;
  /** Words that must each be one linkable segment, as written in the text. */
  words: string[];
  /** What the segment must resolve to when it is a conjugated form. */
  resolves?: Record<string, string>;
}

export const SEGMENT_BENCHMARK: SegmentCase[] = [
  {
    text: "私は毎朝コーヒーを飲みます。",
    words: ["私", "毎朝", "コーヒー", "飲みます"],
    resolves: { 飲みます: "飲む" },
  },
  {
    text: "昨日、駅の近くで新しい本屋を見つけました。",
    words: ["昨日", "駅", "近く", "新しい", "本屋", "見つけました"],
    resolves: { 見つけました: "見つける" },
  },
  {
    text: "日本語の勉強は難しいですが、楽しいです。",
    words: ["日本語", "勉強", "難しい", "楽しい"],
  },
  {
    text: "東京の天気は明日も晴れるでしょう。",
    words: ["東京", "天気", "明日", "晴れる"],
  },
  {
    text: "彼は図書館で本を読んでいた。",
    words: ["彼", "図書館", "本", "読んで"],
    resolves: { 読んで: "読む" },
  },
  {
    text: "電車が遅れたので会議に遅刻した。",
    words: ["電車", "遅れた", "会議", "遅刻"],
    resolves: { 遅れた: "遅れる" },
  },
  {
    text: "子供たちは公園で楽しそうに遊んでいる。",
    words: ["子供たち", "公園", "遊んで"],
    resolves: { 遊んで: "遊ぶ" },
  },
  {
    text: "この料理は少し辛かったけど美味しかった。",
    words: ["料理", "少し", "辛かった", "美味しかった"],
    resolves: { 辛かった: "辛い", 美味しかった: "美味しい" },
  },
  {
    text: "来週の金曜日に友達と映画を見に行く予定です。",
    words: ["来週", "金曜日", "友達", "映画", "予定"],
  },
  {
    text: "先生は学生に宿題を出した。",
    words: ["先生", "学生", "宿題", "出した"],
    resolves: { 出した: "出す" },
  },
  {
    text: "新幹線で大阪まで二時間半かかります。",
    words: ["新幹線", "大阪", "かかります"],
    resolves: { かかります: "かかる" },
  },
  {
    text: "母は毎日野菜を買って晩ご飯を作る。",
    words: ["母", "毎日", "野菜", "買って", "作る"],
    resolves: { 買って: "買う" },
  },
  {
    text: "彼女の話を聞いて、とても驚きました。",
    words: ["彼女", "話", "聞いて", "驚きました"],
    resolves: { 聞いて: "聞く", 驚きました: "驚く" },
  },
  {
    text: "今年の夏は去年より暑くなりそうだ。",
    words: ["今年", "夏", "去年", "暑く"],
  },
  {
    text: "経済の状況は依然として厳しい。",
    words: ["経済", "状況", "依然として", "厳しい"],
  },
  {
    text: "彼は日本の歴史について研究している。",
    words: ["彼", "日本", "歴史", "研究"],
  },
  {
    text: "窓を開けると、冷たい風が入ってきた。",
    words: ["窓", "開ける", "冷たい", "風", "入って"],
    resolves: { 入って: "入る" },
  },
  {
    text: "この問題を解決するために、新しい方法を考えなければならない。",
    words: ["問題", "解決", "新しい", "方法", "考え"],
  },
  {
    text: "スマートフォンの画面が割れてしまった。",
    words: ["スマートフォン", "画面", "割れて"],
    resolves: { 割れて: "割れる" },
  },
  {
    text: "彼らは静かに部屋を出て行った。",
    words: ["彼ら", "静かに", "部屋", "出て行った"],
    resolves: { 出て行った: "出て行く" },
  },
];
