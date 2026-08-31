/**
 * Turns a conjugated Japanese word into candidate dictionary forms.
 *
 * The candidates are deliberately over-generous: 飲み yields both 飲みる and
 * 飲む, and only one of those is a real word. Filtering is the dictionary's
 * job, which keeps these rules small enough to read in one sitting. Being a
 * superset is the only correctness requirement.
 */

import { isKanaOnly } from "@/utils/japanese";

/** Maps any kana to the う-row kana of its consonant row: き → く, わ → う. */
const DICTIONARY_ENDING: Record<string, string> = {
  あ: "う", い: "う", う: "う", え: "う", お: "う", わ: "う",
  か: "く", き: "く", く: "く", け: "く", こ: "く",
  が: "ぐ", ぎ: "ぐ", ぐ: "ぐ", げ: "ぐ", ご: "ぐ",
  さ: "す", し: "す", す: "す", せ: "す", そ: "す",
  た: "つ", ち: "つ", つ: "つ", て: "つ", と: "つ",
  な: "ぬ", に: "ぬ", ぬ: "ぬ", ね: "ぬ", の: "ぬ",
  ば: "ぶ", び: "ぶ", ぶ: "ぶ", べ: "ぶ", ぼ: "ぶ",
  ま: "む", み: "む", む: "む", め: "む", も: "む",
  ら: "る", り: "る", る: "る", れ: "る", ろ: "る",
};

/**
 * Suffixes that leave a verb stem behind. Stripping any of these gives a stem
 * that becomes a dictionary form by appending る (ichidan) or by shifting its
 * final kana to the う row (godan).
 */
const STEM_SUFFIXES = [
  "ませんでした", "ましょう", "ませんで", "ました", "ません", "まして", "ます",
  "たかった", "たくない", "たくて", "たい",
  "なかった", " なくて", "なければ", "ないで", "ない", "ぬ", "ず",
  "られる", "させる", "させて", "られて", "れる", "せる",
  "なさい", "にくい", "やすい", "すぎる", "そう",
  "ましょ", "ようと", "よう", "れば", "ろ", "て", "た", "で", "だ",
];

/** Sound-change endings where the stem's final kana is part of the ending. */
const ONBIN: Record<string, string[]> = {
  って: ["る", "つ", "う", "く"], // く is here for 行った / 行って
  った: ["る", "つ", "う", "く"],
  んで: ["ぬ", "ぶ", "む"],
  んだ: ["ぬ", "ぶ", "む"],
  いて: ["く"],
  いた: ["く"],
  いで: ["ぐ"],
  いだ: ["ぐ"],
  して: ["す"],
  した: ["す"],
};

/** i-adjective endings, all of which resolve to い. */
const ADJECTIVE_SUFFIXES = [
  "くなかった", "くありません", "くなければ", "ければ",
  "くない", "かった", "くて", "さ", "く",
];

/** Forms of する and 来る, which no regular rule reaches. */
const IRREGULAR_STEMS: Record<string, string[]> = {
  し: ["する"],
  さ: ["する"],
  せ: ["する"],
  き: ["来る", "くる"],
  こ: ["来る", "くる"],
  來: ["来る"],
};

function stemCandidates(stem: string): string[] {
  if (!stem) return [];

  const out: string[] = [];
  const last = stem[stem.length - 1];
  const prefix = stem.slice(0, -1);

  const irregular = IRREGULAR_STEMS[last];
  if (irregular) for (const form of irregular) out.push(prefix + form);

  // A one-mora all-kana stem only ever belongs to する or 来る. Without this,
  // しました would also propose 知る (しる) and 巣 (す), both of which are real
  // enough to outrank する.
  if (stem.length === 1 && isKanaOnly(stem)) return out;

  out.push(`${stem}る`);

  const shifted = DICTIONARY_ENDING[last];
  if (shifted) out.push(prefix + shifted);

  return out;
}

function applyOnce(word: string): string[] {
  const out: string[] = [];

  for (const [ending, replacements] of Object.entries(ONBIN)) {
    if (word.length > ending.length && word.endsWith(ending)) {
      const stem = word.slice(0, -ending.length);
      for (const r of replacements) out.push(stem + r);
    }
  }

  for (const suffix of STEM_SUFFIXES) {
    if (word.length > suffix.length && word.endsWith(suffix)) {
      out.push(...stemCandidates(word.slice(0, -suffix.length)));
    }
  }

  for (const suffix of ADJECTIVE_SUFFIXES) {
    if (word.length > suffix.length && word.endsWith(suffix)) {
      out.push(`${word.slice(0, -suffix.length)}い`);
    }
  }

  return out;
}

const MAX_PASSES = 3;

/**
 * Candidate dictionary forms for a conjugated word, most-direct first.
 * The input itself is never included.
 */
export function deinflect(word: string): string[] {
  const seen = new Set<string>([word]);
  const ordered: string[] = [];
  let frontier = [word];

  for (let pass = 0; pass < MAX_PASSES && frontier.length > 0; pass++) {
    const next: string[] = [];
    for (const candidate of frontier) {
      for (const derived of applyOnce(candidate)) {
        if (seen.has(derived)) continue;
        seen.add(derived);
        ordered.push(derived);
        next.push(derived);
      }
    }
    frontier = next;
  }

  return ordered;
}
