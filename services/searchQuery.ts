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
    SELECT e.id, e.kanji_forms, e.reading_forms, e.senses, e.jlpt_level, e.is_common
    FROM entries_fts fts
    JOIN entries e ON e.id = fts.rowid
    WHERE entries_fts MATCH ?
    ORDER BY ${ordering.join(", ")}
    LIMIT ?`,
    params,
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
  return match + (row.is_common === 1 ? COMMON_BONUS : 0) + jlpt;
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
