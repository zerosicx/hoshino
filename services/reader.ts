/**
 * Turns a paragraph of pasted Japanese into tappable words.
 *
 * The split is `utils/segment.ts`; the lookups are `readerQuery.ts`. This file
 * runs them against the databases: one batched query to the dictionary for
 * every candidate term in the paragraph, one to the user database for which
 * of the words found have been looked up before.
 */

import { getDictDb, getUserDb } from "./database";
import { lexiconPlans, toLexicon, visitedSql, type LexiconRow } from "./readerQuery";
import { candidates, furiganaFor, isLinkable, isWordChar, segment } from "@/utils/segment";
import { containsJapanese } from "@/utils/japanese";
import type { ReaderToken } from "@/types/reader";

/** Marks that hang off the word before them, so a line never starts with one. */
const TRAILING = /^[、。，．・」』）】〕｣!?！？…‥ー〜]+$/;

/**
 * The tokens for one paragraph. A paragraph with no Japanese in it needs no
 * query and comes back as a single plain token.
 */
export async function readParagraph(text: string): Promise<ReaderToken[]> {
  if (!text) return [];
  if (!containsJapanese(text)) {
    return [{ text, entryId: null, furigana: [{ base: text, reading: "" }], visited: false, searchable: false }];
  }

  const { terms } = candidates(text);
  const rows: LexiconRow[] = [];
  const dict = getDictDb();
  for (const plan of lexiconPlans(terms)) {
    rows.push(...(await dict.getAllAsync<LexiconRow>(plan.sql, plan.params)));
  }
  const segments = segment(text, toLexicon(rows, terms));

  const ids = [...new Set(segments.filter(isLinkable).map((s) => s.entry!.id))];
  const visited = new Set<number>();
  if (ids.length > 0) {
    const seen = await getUserDb().getAllAsync<{ entry_id: number }>(visitedSql(ids.length), ids);
    for (const row of seen) visited.add(row.entry_id);
  }

  const tokens: ReaderToken[] = [];
  for (const s of segments) {
    const known = isLinkable(s);
    const token: ReaderToken = {
      text: s.text,
      entryId: known ? s.entry!.id : null,
      furigana: furiganaFor(s.text, s.term, s.entry),
      visited: known && visited.has(s.entry!.id),
      searchable: !known && [...s.text].some(isWordChar),
    };
    // Punctuation is glued to the word before it rather than standing alone,
    // so wrapping never leaves a 。 at the start of a line.
    const last = tokens[tokens.length - 1];
    if (last && TRAILING.test(token.text)) {
      last.text += token.text;
      last.furigana = [...last.furigana, { base: token.text, reading: "" }];
      continue;
    }
    tokens.push(token);
  }
  return tokens;
}

/**
 * The same tokens with `visited` brought up to date, for when the reader comes
 * back into view after a word page. One small query to the user database;
 * the dictionary is not asked again.
 */
export async function refreshVisited(tokens: ReaderToken[]): Promise<ReaderToken[]> {
  const ids = [...new Set(tokens.filter((t) => t.entryId !== null).map((t) => t.entryId!))];
  if (ids.length === 0) return tokens;
  const seen = new Set(
    (await getUserDb().getAllAsync<{ entry_id: number }>(visitedSql(ids.length), ids)).map((r) => r.entry_id)
  );
  return tokens.map((t) =>
    t.entryId !== null && seen.has(t.entryId) !== t.visited ? { ...t, visited: seen.has(t.entryId) } : t
  );
}
