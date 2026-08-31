import { afterAll, describe, expect, it } from "vitest";
import {
  buildSearchIntent,
  buildSearchQuery,
  rankEntries,
} from "@/services/searchQuery";
import {
  closeDictionaryDb,
  describeRow,
  dictionaryDbExists,
  runPlan,
} from "@/tests/dictionaryDb";

/**
 * Queries deliberately kept out of `tests/benchmark.ts`. The benchmark is what
 * the ranking was tuned against, so it cannot tell us whether the tuning
 * generalises — these can.
 */
const HELD_OUT = [
  "先生", "電車", "大学", "友達", "食べ物", "テレビ", "かわいい", "忙しい",
  "ください", "おはよう", "読んで", "聞きました", "泳ぎたい", "勉強",
  "densha", "kudasai", "ohayou", "tomodachi",
  "dog", "red", "big", "hello", "train", "student", "difficult",
  "thank you", "good morning",
];

function search(query: string) {
  const intent = buildSearchIntent(query);
  if (!intent) return [];
  return rankEntries(intent, runPlan(buildSearchQuery(intent)));
}

describe.skipIf(!dictionaryDbExists)("search robustness", () => {
  afterAll(closeDictionaryDb);

  it.each(HELD_OUT)("'%s' returns results", (query) => {
    expect(search(query).length).toBeGreaterThan(0);
  });

  it.each([" ", "", "!!!", "zzzzzzz", "ヽ(´ー｀)ノ", "123", "a".repeat(200)])(
    "survives the junk query '%s'",
    (query) => {
      expect(() => search(query)).not.toThrow();
    }
  );

  it("stays within a mobile-friendly latency budget", () => {
    // Warm the page cache so we measure the query, not the first disk read.
    search("水");

    const slowest = HELD_OUT.reduce((worst, query) => {
      const start = performance.now();
      search(query);
      return Math.max(worst, performance.now() - start);
    }, 0);

    console.log(`  slowest held-out query: ${slowest.toFixed(1)}ms`);
    expect(slowest).toBeLessThan(150);
  });

  it("reports what the held-out queries actually return", () => {
    const lines = HELD_OUT.map((query) => {
      const top = search(query)
        .slice(0, 2)
        .map(describeRow)
        .join("   |   ");
      return `  ${query.padEnd(14)} ${top}`;
    });
    console.log(["", "Held-out queries", ...lines, ""].join("\n"));
    expect(lines.length).toBe(HELD_OUT.length);
  });
});
