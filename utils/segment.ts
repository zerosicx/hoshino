/**
 * Splits running Japanese text into dictionary words.
 *
 * Japanese has no spaces, so the reader has to decide where words start and
 * end. This does it with the dictionary itself: every span of up to MAX_SPAN
 * characters is a candidate, a conjugated span is reduced to its dictionary
 * form with `deinflect`, and the split that covers the most text with the
 * fewest, longest, most plausible words wins.
 *
 * Pure. The caller supplies a `Lexicon` — which candidate terms exist — so the
 * same code runs against a fake in unit tests and the real database in the
 * benchmark and the app.
 */

import { deinflect } from "./deinflect";
import { alignFurigana, type FuriganaPair } from "./furigana";
import { isKanaOnly } from "./japanese";

export interface LexiconEntry {
  id: number;
  /** Written forms, kanji first. */
  forms: string[];
  readings: string[];
  common: boolean;
  /** JMdict says the word is usually written in kana, so a kana surface may be it. */
  kanaUsual: boolean;
}

/** Term (a kanji form or a reading) to the entries that have it. */
export type Lexicon = Map<string, LexiconEntry[]>;

export interface Segment {
  /** The text as it appears in the passage. */
  text: string;
  start: number;
  /** The word this span is, or undefined for text the dictionary does not know. */
  entry?: LexiconEntry;
  /** The dictionary form that matched: the text itself, or what it deinflects to. */
  term?: string;
  deinflected: boolean;
}

/**
 * Longest word worth trying. Of JMdict's 217k entries, 5,406 forms are longer
 * than eight characters and 29 of those are common — not worth the candidates.
 */
export const MAX_SPAN = 8;

/** Kana that are particles or endings far more often than words of their own. */
const PARTICLES = new Set(["は", "が", "を", "に", "で", "と", "も", "の", "へ", "や", "か", "ね", "よ", "な", "て", "た", "だ"]);

const KANJI = /[一-鿿々〆]/;
const HIRAGANA = /[ぁ-ゟ]/;
const KATAKANA = /[゠-ヿｦ-ﾟ]/;

/** Characters a word can be made of. Anything else is a boundary. */
export function isWordChar(ch: string): boolean {
  return KANJI.test(ch) || HIRAGANA.test(ch) || KATAKANA.test(ch);
}

/**
 * The spans to look up, and every term they could be in the dictionary.
 *
 * A span's own text is always a term. A span ending in hiragana may also be
 * a conjugated form, so its deinflections are terms too. Spans never cross a
 * non-Japanese character.
 */
export function candidates(text: string): {
  spans: { start: number; end: number; terms: string[] }[];
  terms: Set<string>;
} {
  const chars = [...text];
  const spans: { start: number; end: number; terms: string[] }[] = [];
  const terms = new Set<string>();

  for (let i = 0; i < chars.length; i++) {
    if (!isWordChar(chars[i])) continue;
    for (let j = i + 1; j <= Math.min(chars.length, i + MAX_SPAN); j++) {
      if (!isWordChar(chars[j - 1])) break;
      const span = chars.slice(i, j).join("");
      // A lone kana is a particle or an ending, never a word to look up.
      if (j - i === 1 && !KANJI.test(span)) continue;
      const own = [span];
      if (j - i >= 2 && HIRAGANA.test(chars[j - 1])) {
        for (const form of deinflect(span)) if (form !== span) own.push(form);
      }
      for (const t of own) terms.add(t);
      spans.push({ start: i, end: j, terms: own });
    }
  }

  return { spans, terms };
}

/** Whether a segment opens a word page. Lone kana are never candidates, so this is just "known". */
export function isLinkable(segment: Segment): boolean {
  return !!segment.entry;
}

interface Choice {
  end: number;
  entry?: LexiconEntry;
  term?: string;
  deinflected: boolean;
  score: number;
}

/**
 * Picks the entry for a span: the text itself over a deinflection, then a
 * common word over a rare one. Returns nothing when no term is in the lexicon.
 */
function resolve(
  span: string,
  own: string[],
  lexicon: Lexicon
): { entry: LexiconEntry; term: string; deinflected: boolean } | null {
  const kanaSurface = isKanaOnly(span);
  for (let k = 0; k < own.length; k++) {
    let hits = lexicon.get(own[k]);
    if (!hits || hits.length === 0) continue;
    // Kana in the text is a kanji word only if that word is usually written
    // in kana: ある is 有る, but は is not 歯 and れつ is not 列.
    if (kanaSurface) {
      hits = hits.filter((h) => h.forms.length === 0 || h.kanaUsual || h.forms.includes(span));
      if (hits.length === 0) continue;
    }
    const entry = hits.find((h) => h.common) ?? hits[0];
    return { entry, term: own[k], deinflected: k > 0 };
  }
  return null;
}

/** Kana that end a word only as a particle: a span ending in one is suspect. */
const TAIL_PARTICLES = new Set(["は", "が", "を", "に", "で", "と", "も", "の", "へ"]);

/**
 * Longer words are worth more than shorter ones — quadratically, so that 日本語
 * beats 日本 + 語 — and a rare word climbs a lower curve than a common one, so
 * 毎日 + 野菜 beats 日野菜, a turnip. The span as written beats one that had to
 * be deinflected.
 *
 * Three penalties encode how Japanese is written. Words seldom start or end in
 * the middle of a run of kanji, so a span that does (解|決する, 毎|日野菜) gives
 * way to one that takes the whole run. A deinflection that only works by
 * treating a trailing particle as an ending (近くで → 近い) gives way to the
 * word before the particle. A span with a case particle inside it (面が割れて)
 * gives way unless it is common as written.
 */
function spanScore(
  text: string[],
  start: number,
  end: number,
  deinflected: boolean,
  common: boolean,
  lexicon: Lexicon
): number {
  const chars = text.slice(start, end);
  const length = chars.length;
  let score = length * length * (common ? 3 : 2);
  if (!deinflected) score += 2;

  if (start > 0 && KANJI.test(text[start - 1]) && KANJI.test(chars[0])) score -= 6;
  if (end < text.length && KANJI.test(text[end]) && KANJI.test(chars[length - 1])) score -= 6;

  if (deinflected && length >= 2 && TAIL_PARTICLES.has(chars[length - 1])) {
    const head = chars.slice(0, -1).join("");
    if (lexicon.get(head)?.some((e) => e.common)) score -= 20;
  }
  if (length >= 3 && !(common && !deinflected)) {
    for (let i = 1; i < length - 1; i++) {
      if (TAIL_PARTICLES.has(chars[i])) {
        score -= 20;
        break;
      }
    }
  }
  return score;
}

const UNKNOWN_COST = -3;

/**
 * The best segmentation of `text` given what the lexicon knows.
 *
 * Dynamic programming over character positions: the best split of the text
 * from position i is the best-scoring word starting at i plus the best split
 * of what follows, or one unknown character plus the best split after it.
 * Runs of unknown or non-Japanese characters are merged into one segment so
 * "Tokyo 2026" is not eleven pieces.
 */
export function segment(text: string, lexicon: Lexicon): Segment[] {
  const chars = [...text];
  const n = chars.length;
  const { spans } = candidates(text);

  const startingAt: Choice[][] = Array.from({ length: n }, () => []);
  for (const span of spans) {
    const spanChars = chars.slice(span.start, span.end);
    const hit = resolve(spanChars.join(""), span.terms, lexicon);
    if (!hit) continue;
    startingAt[span.start].push({
      end: span.end,
      entry: hit.entry,
      term: hit.term,
      deinflected: hit.deinflected,
      score: spanScore(chars, span.start, span.end, hit.deinflected, hit.entry.common, lexicon),
    });
  }

  const best: number[] = new Array(n + 1).fill(0);
  const pick: (Choice | null)[] = new Array(n).fill(null);
  for (let i = n - 1; i >= 0; i--) {
    best[i] = best[i + 1] + UNKNOWN_COST;
    pick[i] = null;
    for (const choice of startingAt[i]) {
      const total = choice.score + best[choice.end];
      if (total > best[i] || (total === best[i] && pick[i] && choice.end > pick[i]!.end)) {
        best[i] = total;
        pick[i] = choice;
      }
    }
  }

  const out: Segment[] = [];
  let i = 0;
  while (i < n) {
    const choice = pick[i];
    if (choice) {
      out.push({
        text: chars.slice(i, choice.end).join(""),
        start: i,
        entry: choice.entry,
        term: choice.term,
        deinflected: choice.deinflected,
      });
      i = choice.end;
    } else {
      const last = out[out.length - 1];
      if (last && !last.entry) last.text += chars[i];
      else out.push({ text: chars[i], start: i, deinflected: false });
      i += 1;
    }
  }
  return out;
}

/**
 * Readings for a segment as it appears in the text.
 *
 * The dictionary knows 食べる / たべる; the passage says 食べた. The kanji keep
 * the readings the dictionary form gives them, and whatever the passage has
 * after the part the two share is kana that needs none. A kana-only word has
 * no readings to place at all. Falls back to the surface bare when the match
 * is a reading rather than a written form, which means nothing is known about
 * where its kanji are read how.
 */
export function furiganaFor(
  text: string,
  term: string | undefined,
  entry: LexiconEntry | undefined
): FuriganaPair[] {
  if (!entry || !term || isKanaOnly(text) || !entry.forms.includes(term)) {
    return [{ base: text, reading: "" }];
  }
  const reading = entry.readings[0] ?? "";
  if (!reading) return [{ base: text, reading: "" }];

  const dictionaryPairs = alignFurigana(term, reading);
  if (text === term) return dictionaryPairs;

  const shared = commonPrefixLength([...text], [...term]);
  const pairs: FuriganaPair[] = [];
  let covered = 0;
  for (const pair of dictionaryPairs) {
    const length = [...pair.base].length;
    if (covered + length > shared) break;
    pairs.push(pair);
    covered += length;
  }
  const rest = [...text].slice(covered).join("");
  if (rest) pairs.push({ base: rest, reading: "" });
  return pairs;
}

function commonPrefixLength(a: string[], b: string[]): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}
