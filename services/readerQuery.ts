/**
 * SQL and row mapping for the reader, free of any database import so the
 * segmentation benchmark can run it against `assets/hoshino.db` in Node.
 *
 * The reader needs one question answered for thousands of candidate strings
 * at once: is this a word, and if so which? `entries_fts` indexes each written
 * form and reading as a single token, so an exact-token match on a list of
 * terms answers it in one scan per chunk instead of one query per term.
 */

import { parseJsonArray, parseSenses } from "@/utils/entryJson";
import type { Lexicon, LexiconEntry } from "@/utils/segment";

export interface LexiconRow {
  id: number;
  kanji_forms: string | null;
  reading_forms: string | null;
  is_common: number;
  senses: string | null;
}

/** JMdict's "word usually written using kana alone", as fast-xml-parser expands it. */
export function isKanaUsual(senses: ReturnType<typeof parseSenses>): boolean {
  return senses.some((s) => s.misc.some((m) => /kana alone/i.test(m)));
}

/**
 * FTS5 copes with long OR lists: a 400-character paragraph is about 2,400
 * distinct terms and resolves in one query in ~100ms in Node. The cap is a
 * safety limit on the bind string, not a tuning knob.
 */
export const LEXICON_CHUNK = 1000;

function ftsLiteral(term: string): string {
  return `"${term.replace(/"/g, '""')}"`;
}

export interface LexiconPlan {
  sql: string;
  params: string[];
}

/** One query per chunk of terms. Each returns every entry with any of them. */
export function lexiconPlans(terms: Iterable<string>): LexiconPlan[] {
  const list = [...new Set(terms)].filter((t) => t.length > 0);
  const plans: LexiconPlan[] = [];
  for (let i = 0; i < list.length; i += LEXICON_CHUNK) {
    const chunk = list.slice(i, i + LEXICON_CHUNK);
    const match = `{kanji_text reading_text} : (${chunk.map(ftsLiteral).join(" OR ")})`;
    plans.push({
      sql: `
        SELECT e.id, e.kanji_forms, e.reading_forms, e.is_common, e.senses
        FROM entries_fts fts
        JOIN entries e ON e.id = fts.rowid
        WHERE entries_fts MATCH ?`,
      params: [match],
    });
  }
  return plans;
}

/**
 * Builds the lexicon the segmenter reads from, keyed by every form and reading
 * that was asked for. A row matched by prefix or by a term we did not ask
 * about contributes nothing, so the map answers exactly the question posed.
 */
export function toLexicon(rows: LexiconRow[], wanted: Set<string>): Lexicon {
  const lexicon: Lexicon = new Map();
  for (const row of rows) {
    const forms = parseJsonArray(row.kanji_forms);
    const readings = parseJsonArray(row.reading_forms);
    const entry: LexiconEntry = {
      id: row.id,
      forms,
      readings,
      common: row.is_common === 1,
      kanaUsual: isKanaUsual(parseSenses(row.senses)),
    };
    for (const term of [...forms, ...readings]) {
      if (!wanted.has(term)) continue;
      const list = lexicon.get(term);
      if (list) {
        if (!list.some((e) => e.id === entry.id)) list.push(entry);
      } else {
        lexicon.set(term, [entry]);
      }
    }
  }
  return lexicon;
}

/** Which of these words the user has looked up before. Params: the entry ids. */
export function visitedSql(count: number): string {
  const placeholders = Array.from({ length: count }, () => "?").join(",");
  return `SELECT entry_id FROM search_history WHERE entry_id IN (${placeholders})`;
}

/**
 * Splits a passage into the paragraphs the reader lays out. Blank lines are
 * dropped; a run-on paragraph is broken at sentence ends once it passes a few
 * hundred characters, so no single block has to mount thousands of views.
 */
export function paragraphsOf(text: string, maxChars = 400): string[] {
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if ([...trimmed].length <= maxChars) {
      out.push(trimmed);
      continue;
    }
    let current = "";
    for (const sentence of trimmed.split(/(?<=[。！？!?])/)) {
      if (current && [...current].length + [...sentence].length > maxChars) {
        out.push(current);
        current = "";
      }
      current += sentence;
    }
    if (current) out.push(current);
  }
  return out;
}
