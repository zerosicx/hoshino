/**
 * Search planning and ranking, kept free of any database handle.
 *
 * BM25 scores depend on corpus-wide statistics, so ranking can only be
 * verified against the real 217k-entry dictionary. Keeping this module pure
 * lets the benchmark in `searchQuery.test.ts` open `assets/hoshino.db`
 * directly instead of booting Expo.
 */

import { deinflect } from "@/utils/deinflect";
import { parseJsonArray, parseSenses } from "@/utils/entryJson";
import {
  containsJapanese,
  isKanaOnly,
  isKanjiOnly,
  romajiToHiragana,
  toHiragana,
  toKatakana,
} from "@/utils/japanese";

/** How far a candidate term is from what the user actually typed. */
export type Derivation = "direct" | "kana" | "romaji" | "deinflected";

export interface FormCandidate {
  term: string;
  derivation: Derivation;
}

export interface SearchIntent {
  /** The trimmed query, as typed. */
  raw: string;
  /** Japanese surface forms to match against kanji and reading columns. */
  forms: FormCandidate[];
  /** English tokens to match against the meaning column. */
  glossTokens: string[];
}

export interface SearchQueryPlan {
  sql: string;
  params: (string | number)[];
}

/**
 * How far down the result list we look before ranking. Candidate sets for even
 * the broadest queries sit under 2000 rows, and the pool is ordered so exact
 * matches and common words are never truncated away.
 */
const CANDIDATE_POOL = 300;

// ---------------------------------------------------------------------------
// Intent
// ---------------------------------------------------------------------------

function addForm(
  into: Map<string, FormCandidate>,
  term: string,
  derivation: Derivation
): void {
  if (!term || into.has(term)) return;
  into.set(term, { term, derivation });
}

/** Expands one Japanese surface form into its kana-folded variants. */
function withKanaVariants(
  into: Map<string, FormCandidate>,
  term: string,
  derivation: Derivation
): void {
  addForm(into, term, derivation);
  if (!isKanaOnly(term)) return;
  const folded = derivation === "direct" ? "kana" : derivation;
  addForm(into, toHiragana(term), folded);
  addForm(into, toKatakana(term), folded);
}

export function buildSearchIntent(query: string): SearchIntent | null {
  const raw = query.trim();
  if (!raw) return null;

  const forms = new Map<string, FormCandidate>();
  const glossTokens: string[] = [];

  if (containsJapanese(raw)) {
    withKanaVariants(forms, raw, "direct");
    for (const candidate of deinflect(raw)) {
      withKanaVariants(forms, candidate, "deinflected");
    }
    // Katakana input for a native word: 食べる is indexed in hiragana
    for (const candidate of deinflect(toHiragana(raw))) {
      withKanaVariants(forms, candidate, "deinflected");
    }
  } else {
    glossTokens.push(...raw.split(/\s+/).filter(Boolean));

    const kana = romajiToHiragana(raw.replace(/\s+/g, ""));
    if (kana) {
      withKanaVariants(forms, kana, "romaji");
      for (const candidate of deinflect(kana)) {
        withKanaVariants(forms, candidate, "deinflected");
      }
    }
  }

  return { raw, forms: [...forms.values()], glossTokens };
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

/** FTS5 string literal: wrap in double quotes, double any inside. */
function ftsLiteral(term: string): string {
  return `"${term.replace(/"/g, '""')}"`;
}

function matchExpression(intent: SearchIntent): string {
  const clauses: string[] = [];

  if (intent.forms.length > 0) {
    const terms = intent.forms.map((f) => `${ftsLiteral(f.term)}*`).join(" OR ");
    clauses.push(`({kanji_text reading_text} : (${terms}))`);
  }

  if (intent.glossTokens.length > 0) {
    const terms = intent.glossTokens
      .map((t) => `meaning_text : ${ftsLiteral(t)}`)
      .join(" ");
    clauses.push(`(${terms})`);
  }

  return clauses.join(" OR ");
}

export function buildSearchQuery(
  intent: SearchIntent,
  limit = CANDIDATE_POOL
): SearchQueryPlan {
  const params: (string | number)[] = [matchExpression(intent)];

  // Guarantees exact form matches survive the pool cut-off no matter how the
  // full-text ranker scored them.
  const forms = "COALESCE(e.kanji_forms,'') || COALESCE(e.reading_forms,'')";
  const exactChecks = intent.forms.map(() => `instr(${forms}, ?) > 0`);
  for (const form of intent.forms) params.push(`"${form.term}"`);

  // A bare `0` here would be read as an ORDER BY column ordinal, not a value.
  const ordering = exactChecks.length > 0
    ? [`(${exactChecks.join(" OR ")}) DESC`, "e.is_common DESC", "rank"]
    : ["e.is_common DESC", "rank"];

  params.push(limit);

  return {
    sql: `
    SELECT e.id, e.kanji_forms, e.reading_forms, e.senses, e.jlpt_level,
           e.is_common, e.frequency_rank
    FROM entries_fts fts
    JOIN entries e ON e.id = fts.rowid
    WHERE entries_fts MATCH ?
    ORDER BY ${ordering.join(", ")}
    LIMIT ?`,
    params,
  };
}

/**
 * Longest kanji query still worth answering from the per-kanji index.
 *
 * Beyond this the query is a word rather than a fragment of one, and the
 * full-text index already matches it.
 */
const MAX_KANJI_FRAGMENT = 3;

/**
 * Words containing the query somewhere other than the start, like 水曜日 for 曜.
 *
 * `entries_fts` treats a whole Japanese word as one token and matches prefixes,
 * so it cannot reach these at all. A trigram index does not help: FTS5's
 * trigram tokenizer ignores queries under three characters, and these queries
 * are one or two.
 *
 * Returns null when the query is not a short run of kanji, which is the only
 * case this index answers.
 */
export function buildMidWordQuery(query: string): SearchQueryPlan | null {
  const raw = query.trim();
  const chars = [...new Set([...raw])];
  if (!isKanjiOnly(raw) || chars.length > MAX_KANJI_FRAGMENT) return null;

  const placeholders = chars.map(() => "?").join(",");

  return {
    // Unioning the characters' lists would also return words using just one of
    // them, so the EXISTS keeps only words containing the query itself.
    sql: `
    SELECT DISTINCT e.id, e.kanji_forms, e.reading_forms, e.senses,
           e.jlpt_level, e.is_common, e.frequency_rank
    FROM kanji k
    JOIN json_each(k.entry_ids) ids
    JOIN entries e ON e.id = ids.value
    WHERE k.character IN (${placeholders})
      AND EXISTS (
        SELECT 1 FROM json_each(e.kanji_forms) form
        WHERE instr(form.value, ?) > 0
      )
    LIMIT ?`,
    params: [...chars, raw, CANDIDATE_POOL],
  };
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

export interface RankableRow {
  kanji_forms: string | null;
  reading_forms: string | null;
  senses: string | null;
  jlpt_level: number | null;
  is_common: number;
  frequency_rank: number | null;
}

/**
 * Score bands. The gaps are wide enough that a band always beats the one below
 * it, so `is_common` and JLPT level only ever break ties within a band — they
 * can never promote an unrelated entry over a real match, which is what the
 * previous `rank - (is_common * 15)` arithmetic allowed.
 */
const FORM_EXACT = 1000;
const FORM_PREFIX = 400;

/**
 * A word that merely contains the query, like 水曜日 for 曜.
 *
 * Ranked well below a prefix match, so 曜日 still comes first — this band is
 * for results the prefix-anchored index cannot reach at all.
 */
const FORM_CONTAINS = 150;

/**
 * Gloss scoring is dominated by *where* the match sits, not how tight it is.
 * A word's first gloss is what it primarily means, so 走る ("to run") must beat
 * 競走 ("race, run, dash"), whose second gloss matches "run" exactly.
 */
const GLOSS_BASE = 700;
const GLOSS_SENSE_PENALTY = 200;
const GLOSS_INDEX_PENALTY = 60;
const GLOSS_LEADING_BONUS = 40;

const DERIVATION_PENALTY: Record<Derivation, number> = {
  direct: 0,
  kana: 20,
  romaji: 40,
  deinflected: 60,
};

const JLPT_BONUS: Record<number, number> = { 5: 40, 4: 30, 3: 20, 2: 12, 1: 6 };
const COMMON_BONUS = 50;

/**
 * Widest gap frequency may open between two entries.
 *
 * Small on purpose. `nfNN` measures *newspaper* frequency, so it favours words
 * like 書物 and 行う over the everyday 本 and 行く, which carry `ichi1` and no
 * band at all. Scored any higher it stops breaking ties and starts deciding
 * results, which is the wrong bias for a learner's dictionary.
 */
const FREQUENCY_BONUS = 12;

/** JMdict's least frequent band. */
const LOWEST_BAND = 48;

/**
 * Turns a frequency band into a bonus, nf01 highest.
 *
 * A missing band means the newspaper corpus never measured the word, not that
 * the word is rare — 本 has none. Absent therefore scores as average rather
 * than worst, so a banded word cannot leapfrog an unbanded one on the strength
 * of having been measured at all.
 */
function frequencyBonus(rank: number | null): number {
  if (rank === null) return FREQUENCY_BONUS / 2;
  const clamped = Math.min(Math.max(rank, 1), LOWEST_BAND);
  return Math.round(
    (FREQUENCY_BONUS * (LOWEST_BAND - clamped)) / (LOWEST_BAND - 1)
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formScore(intent: SearchIntent, row: RankableRow): number {
  const surfaces = [
    ...parseJsonArray(row.kanji_forms),
    ...parseJsonArray(row.reading_forms),
  ];
  if (surfaces.length === 0) return 0;

  let best = 0;
  for (const { term, derivation } of intent.forms) {
    const penalty = DERIVATION_PENALTY[derivation];
    for (const surface of surfaces) {
      if (surface === term) best = Math.max(best, FORM_EXACT - penalty);
      else if (surface.startsWith(term))
        best = Math.max(best, FORM_PREFIX - penalty);
      else if (surface.includes(term))
        best = Math.max(best, FORM_CONTAINS - penalty);
    }
  }
  return best;
}

function glossScore(intent: SearchIntent, row: RankableRow): number {
  if (intent.glossTokens.length === 0) return 0;

  const phrase = intent.raw.toLowerCase();
  const wordBoundary = new RegExp(`\\b${escapeRegExp(phrase)}\\b`);
  const senses = parseSenses(row.senses);

  let best = 0;
  for (let s = 0; s < senses.length; s++) {
    for (let g = 0; g < senses[s].glosses.length; g++) {
      const gloss = senses[s].glosses[g].toLowerCase();
      if (!wordBoundary.test(gloss)) continue;

      const leading =
        gloss === phrase ||
        (gloss.startsWith(phrase) && !/[a-z0-9]/.test(gloss[phrase.length]));

      const score =
        GLOSS_BASE -
        Math.min(s, 3) * GLOSS_SENSE_PENALTY -
        Math.min(g, 5) * GLOSS_INDEX_PENALTY +
        (leading ? GLOSS_LEADING_BONUS : 0);

      best = Math.max(best, score);
    }
  }
  return Math.max(best, 0);
}

export function scoreEntry(intent: SearchIntent, row: RankableRow): number {
  const match = Math.max(formScore(intent, row), glossScore(intent, row));
  if (match === 0) return 0;

  const jlpt = row.jlpt_level ? (JLPT_BONUS[row.jlpt_level] ?? 0) : 0;
  return (
    match +
    (row.is_common === 1 ? COMMON_BONUS : 0) +
    jlpt +
    frequencyBonus(row.frequency_rank)
  );
}

/**
 * Re-orders the candidate pool. The pool's own order (full-text rank) is the
 * final tie-break, so equally-scored entries keep a stable, sensible order.
 */
export function rankEntries<T extends RankableRow>(
  intent: SearchIntent,
  rows: T[],
  limit = 50
): T[] {
  return rows
    .map((row, index) => ({ row, index, score: scoreEntry(intent, row) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((scored) => scored.row);
}
