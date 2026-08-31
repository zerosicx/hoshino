import { afterAll, describe, expect, it } from "vitest";
import {
  buildSearchIntent,
  buildSearchQuery,
  rankEntries,
} from "@/services/searchQuery";
import { BENCHMARK, type BenchmarkCase } from "@/tests/benchmark";
import {
  closeDictionaryDb,
  describeRow,
  dictionaryDbExists,
  rankOf,
  runPlan,
} from "@/tests/dictionaryDb";

interface Outcome {
  test: BenchmarkCase;
  rank: number;
  top: string;
}

const outcomes: Outcome[] = [];

function search(query: string) {
  const intent = buildSearchIntent(query);
  if (!intent) throw new Error(`no search intent for "${query}"`);
  return rankEntries(intent, runPlan(buildSearchQuery(intent)));
}

describe.skipIf(!dictionaryDbExists)("search ranking benchmark", () => {
  afterAll(() => {
    report();
    closeDictionaryDb();
  });

  it.each(BENCHMARK)(
    "$category: '$query' ranks $expected first",
    (testCase) => {
      const rows = search(testCase.query);
      const rank = rankOf(rows, testCase.expected);
      outcomes.push({
        test: testCase,
        rank,
        top: rows[0] ? describeRow(rows[0]) : "(no results)",
      });

      expect(
        rank,
        rank === -1
          ? `"${testCase.query}" returned ${rows.length} results, none of them ${testCase.expected}. Top: ${outcomes[outcomes.length - 1].top}`
          : `"${testCase.query}" ranked ${testCase.expected} at position ${rank + 1}. Top: ${outcomes[outcomes.length - 1].top}`
      ).toBe(0);
    }
  );
});

function report(): void {
  if (outcomes.length === 0) return;

  const byCategory = new Map<string, { pass: number; total: number }>();
  for (const o of outcomes) {
    const bucket = byCategory.get(o.test.category) ?? { pass: 0, total: 0 };
    bucket.total += 1;
    if (o.rank === 0) bucket.pass += 1;
    byCategory.set(o.test.category, bucket);
  }

  const passed = outcomes.filter((o) => o.rank === 0).length;
  const missing = outcomes.filter((o) => o.rank === -1).length;

  const lines = [
    "",
    "Search benchmark ————————————————————————————————————",
    `  top-1 correct   ${passed}/${outcomes.length}`,
    `  not returned    ${missing}/${outcomes.length}`,
    "",
  ];
  for (const [category, { pass, total }] of byCategory) {
    lines.push(`  ${category.padEnd(22)} ${pass}/${total}`);
  }
  lines.push("");
  for (const o of outcomes.filter((x) => x.rank !== 0)) {
    const where = o.rank === -1 ? "ABSENT" : `#${o.rank + 1}`;
    lines.push(
      `  ✗ ${o.test.query.padEnd(12)} want ${o.test.expected.padEnd(8)} ${where.padEnd(7)} got: ${o.top}`
    );
  }
  lines.push("————————————————————————————————————————————————————", "");
  console.log(lines.join("\n"));
}
