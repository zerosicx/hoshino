import { afterAll, describe, expect, it } from "vitest";
import {
  buildMidWordQuery,
  buildSearchIntent,
  buildSearchQuery,
  rankEntries,
} from "@/services/searchQuery";
import {
  closeDictionaryDb,
  dictionaryDbExists,
  rankOf,
  runPlan,
  surfaceForms,
} from "@/tests/dictionaryDb";

/**
 * Mirrors `searchEntries`, which cannot be imported here because it opens the
 * database through expo-sqlite.
 */
function search(query: string, limit = 50) {
  const intent = buildSearchIntent(query);
  if (!intent) return [];

  const rows = runPlan(buildSearchQuery(intent));

  const midWord = buildMidWordQuery(intent.raw);
  if (midWord) {
    const seen = new Set(rows.map((r) => r.id));
    rows.push(...runPlan(midWord).filter((r) => !seen.has(r.id)));
  }

  return rankEntries(intent, rows, limit);
}

describe.skipIf(!dictionaryDbExists)("mid-word kanji search", () => {
  afterAll(closeDictionaryDb);

  // The case the prefix-anchored index cannot reach: 曜 is the second
  // character of 水曜日, so nothing in entries_fts matches it.
  it.each([
    ["曜", "水曜日"],
    ["曜", "日曜日"],
    ["曜日", "水曜日"],
  ])("'%s' finds %s on the first page", (query, expected) => {
    expect(rankOf(search(query), expected)).toBeGreaterThanOrEqual(0);
  });

  it("still puts a prefix match above a mid-word one", () => {
    const results = search("曜");
    const prefix = rankOf(results, "曜日");
    const midWord = rankOf(results, "水曜日");

    expect(prefix).toBeGreaterThanOrEqual(0);
    expect(midWord).toBeGreaterThan(prefix);
  });

  /**
   * Every word starting with the query outranks every word merely containing
   * it, so a kanji with many compounds of its own buries the mid-word matches:
   * 64 words begin with 階, which pushes 二階 off a 50-result page. Reachable,
   * but not on the first page — the rule is deliberate, so this pins it down
   * rather than pretending otherwise.
   */
  it("reaches mid-word matches behind a long tail of prefix matches", () => {
    expect(rankOf(search("階"), "二階")).toBe(-1);
    expect(rankOf(search("階", 200), "二階")).toBeGreaterThanOrEqual(0);
  });

  it("leaves non-kanji queries to the full-text index", () => {
    expect(buildMidWordQuery("ねこ")).toBeNull();
    expect(buildMidWordQuery("cat")).toBeNull();
    expect(buildMidWordQuery("食べる")).toBeNull();
    // Long enough that the word itself is indexed.
    expect(buildMidWordQuery("図書館員")).toBeNull();
  });

  it("keeps the top result for a whole word unchanged", () => {
    // 水 is a query the index already answered well; mid-word matches must not
    // displace the entry the user actually meant.
    expect(surfaceForms(search("水")[0])).toContain("水");
  });
});
