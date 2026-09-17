/**
 * Aligns a written form with its reading so furigana sits over the kanji only.
 *
 * 食べる / たべる becomes 食(た) + べる rather than one 食べる(たべる) block. The
 * kana in a word are their own anchors: whatever sits between two kana anchors
 * in the reading must belong to the kanji between them.
 */

import { isKanaOnly, kanaToRomaji } from "./japanese";

export interface FuriganaPair {
  base: string;
  /** Empty for kana, which need no annotation. */
  reading: string;
}

/**
 * The line shown above one part of a word, or "" when there is nothing to show.
 *
 * Kana carries no reading of its own because a reader of Japanese does not need
 * one. Someone reading romaji does: きれい is as opaque to them as 綺麗, so in
 * romaji mode the kana is transliterated too.
 */
export function rubyText(pair: FuriganaPair, romaji: boolean): string {
  if (pair.reading) return romaji ? kanaToRomaji(pair.reading) : pair.reading;
  return romaji && isKanaOnly(pair.base) ? kanaToRomaji(pair.base) : "";
}

const KANJI = /[\u4E00-\u9FFF\u3005]/;

function isKanji(char: string): boolean {
  return KANJI.test(char);
}

/** Splits a word into alternating kanji and kana runs. */
function runs(word: string): { text: string; kanji: boolean }[] {
  const out: { text: string; kanji: boolean }[] = [];
  for (const char of word) {
    const kanji = isKanji(char);
    const last = out[out.length - 1];
    if (last && last.kanji === kanji) last.text += char;
    else out.push({ text: char, kanji });
  }
  return out;
}

/** Katakana to hiragana, so ア-readings anchor against あ-readings. */
function fold(text: string): string {
  return text.replace(/[\u30A1-\u30F6]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  );
}

/**
 * Pairs each run of `written` with the slice of `reading` it is read as.
 * Falls back to a single pair covering the whole word when the reading cannot
 * be split, which is correct, just less granular.
 */
export function alignFurigana(written: string, reading: string): FuriganaPair[] {
  if (!written) return [];
  if (!reading || written === reading) {
    return [{ base: written, reading: "" }];
  }

  const segments = runs(written);
  if (!segments.some((s) => s.kanji)) {
    return [{ base: written, reading: "" }];
  }

  const foldedReading = fold(reading);
  const pairs: FuriganaPair[] = [];
  let cursor = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (!segment.kanji) {
      const folded = fold(segment.text);
      // Leading kana must sit at the cursor; later kana anchor the kanji before
      // them, so search forward for the next occurrence.
      const at =
        i === 0
          ? foldedReading.startsWith(folded, cursor)
            ? cursor
            : -1
          : foldedReading.indexOf(folded, cursor);
      if (at < 0) return [{ base: written, reading }];

      pairs.push({ base: segment.text, reading: "" });
      cursor = at + segment.text.length;
      continue;
    }

    const next = segments[i + 1];
    if (!next) {
      pairs.push({ base: segment.text, reading: reading.slice(cursor) });
      cursor = reading.length;
      continue;
    }

    // The kana after this run anchors its end. A trailing run can only be the
    // end of the reading, and any run reads as at least one kana, so the search
    // starts past the cursor, otherwise 痛い/いたい finds い inside 痛's own
    // reading and leaves the kanji with nothing.
    const nextFolded = fold(next.text);
    const trailing = i + 1 === segments.length - 1;
    const at = trailing
      ? foldedReading.endsWith(nextFolded)
        ? foldedReading.length - nextFolded.length
        : -1
      : foldedReading.indexOf(nextFolded, cursor + 1);
    if (at <= cursor) return [{ base: written, reading }];

    pairs.push({ base: segment.text, reading: reading.slice(cursor, at) });
    cursor = at;
  }

  // A reading longer than the word accounts for means the split went wrong.
  if (cursor !== reading.length) return [{ base: written, reading }];

  return pairs;
}

/** First-mora voicing a reading takes after another kanji: 新聞 is しん + ぶん. */
const VOICED: Record<string, string[]> = {
  か: ["が"], き: ["ぎ"], く: ["ぐ"], け: ["げ"], こ: ["ご"],
  さ: ["ざ"], し: ["じ"], す: ["ず"], せ: ["ぜ"], そ: ["ぞ"],
  た: ["だ"], ち: ["ぢ"], つ: ["づ"], て: ["で"], と: ["ど"],
  は: ["ば", "ぱ"], ひ: ["び", "ぴ"], ふ: ["ぶ", "ぷ"], へ: ["べ", "ぺ"], ほ: ["ぼ", "ぽ"],
};

/**
 * The ways one kanji can be read in a given position of a compound: each
 * listed reading, plus its sound changes. Longest first, so where two splits
 * both fit the fuller reading wins (合気道 is あい|き|どう, not あ|いき|どう).
 */
function readingForms(
  listed: string[],
  first: boolean,
  last: boolean
): string[] {
  const forms = new Set<string>();
  for (const entry of listed) {
    // KANJIDIC writes kun readings as stem.okurigana and marks affixes with -.
    const stem = fold(entry).replace(/-/g, "").split(".")[0];
    if (stem) forms.add(stem);
  }
  for (const stem of [...forms]) {
    if (!first) {
      for (const voiced of VOICED[stem[0]] ?? []) forms.add(voiced + stem.slice(1));
    }
    // A closing つ/ち/く/き doubles into the next kanji: 学校 is がっ + こう.
    if (!last && /[つちくき]$/.test(stem)) forms.add(stem.slice(0, -1) + "っ");
  }
  return [...forms].sort((a, b) => b.length - a.length);
}

/**
 * One reading per kanji of a run, using the readings KANJIDIC lists for each,
 * or null when they do not account for the whole reading. Jukujikun like 大人
 * and irregulars like 日本's に are refused rather than guessed, and stay as
 * one reading over the run.
 */
export function splitKanjiRun(
  run: string,
  reading: string,
  readings: Map<string, string[]>
): string[] | null {
  const chars = [...run];
  const folded = fold(reading);

  const go = (i: number, at: number): string[] | null => {
    if (i === chars.length) return at === folded.length ? [] : null;
    const listed = readings.get(chars[i]);
    if (!listed) return null;
    const first = i === 0;
    const last = i === chars.length - 1;
    for (const form of readingForms(listed, first, last)) {
      if (!folded.startsWith(form, at)) continue;
      const rest = go(i + 1, at + form.length);
      if (rest) return [reading.slice(at, at + form.length), ...rest];
    }
    return null;
  };

  return go(0, 0);
}

/**
 * Splits every multi-kanji pair into one pair per kanji where the readings
 * allow it. Pairs it cannot split are kept as they are.
 */
export function splitCompounds(
  pairs: FuriganaPair[],
  readings: Map<string, string[]>
): FuriganaPair[] {
  return pairs.flatMap((pair) => {
    const chars = [...pair.base];
    if (!pair.reading || chars.length < 2 || !chars.every(isKanji)) return [pair];
    const parts = splitKanjiRun(pair.base, pair.reading, readings);
    if (!parts) return [pair];
    return chars.map((base, i) => ({ base, reading: parts[i] }));
  });
}

/**
 * Reading for each kanji run in a word, keyed by the run itself.
 * 食べ物 / たべもの yields { 食: た, 物: もの }.
 */
export function kanjiRunReadings(
  written: string,
  reading: string
): Map<string, string> {
  const out = new Map<string, string>();
  for (const pair of alignFurigana(written, reading)) {
    if (pair.reading && isKanji(pair.base[0])) out.set(pair.base, pair.reading);
  }
  return out;
}

/**
 * Merges many written/reading pairs into one lookup of kanji run to reading.
 * Earlier sources win, so a sentence's own vocabulary beats anything added as
 * a fallback.
 */
export function buildReadingIndex(
  sources: { written: string; reading: string }[]
): Map<string, string> {
  const index = new Map<string, string>();
  for (const { written, reading } of sources) {
    for (const [run, value] of kanjiRunReadings(written, reading)) {
      if (!index.has(run)) index.set(run, value);
    }
  }
  return index;
}

/**
 * Annotates a sentence using known kanji-run readings, longest run first so
 * 誕生日 wins over 日. Runs with no known reading are left bare rather than
 * guessed, since wrong furigana is worse than none.
 *
 * Unannotated text is emitted one character at a time so a rendered sentence
 * can wrap between them.
 */
export function annotateSentence(
  sentence: string,
  readings: Map<string, string>
): FuriganaPair[] {
  const known = [...readings.keys()].sort((a, b) => b.length - a.length);
  const pairs: FuriganaPair[] = [];

  let i = 0;
  while (i < sentence.length) {
    const match = isKanji(sentence[i])
      ? known.find((run) => sentence.startsWith(run, i))
      : undefined;

    if (match) {
      pairs.push({ base: match, reading: readings.get(match) ?? "" });
      i += match.length;
    } else {
      pairs.push({ base: sentence[i], reading: "" });
      i += 1;
    }
  }

  return pairs;
}
