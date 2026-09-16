import { afterAll, describe, expect, it } from "vitest";
import { candidates, isLinkable, segment, type Segment } from "@/utils/segment";
import { lexiconPlans, toLexicon, type LexiconRow } from "@/services/readerQuery";
import { SEGMENT_BENCHMARK, type SegmentCase } from "@/tests/segmentBenchmark";
import { closeDictionaryDb, dictionaryDbExists, openDictionaryDb } from "@/tests/dictionaryDb";

/** Segments a passage the way the app will: candidates → lexicon → split. */
function segmentWithDictionary(text: string): { segments: Segment[]; queries: number; ms: number } {
  const started = performance.now();
  const { terms } = candidates(text);
  const plans = lexiconPlans(terms);
  const db = openDictionaryDb();
  const rows: LexiconRow[] = [];
  for (const plan of plans) rows.push(...(db.prepare(plan.sql).all(...plan.params) as LexiconRow[]));
  const segments = segment(text, toLexicon(rows, terms));
  return { segments, queries: plans.length, ms: performance.now() - started };
}

interface Miss {
  text: string;
  word: string;
  got: string;
}

const misses: Miss[] = [];
let listed = 0;
let found = 0;
let totalMs = 0;

describe.skipIf(!dictionaryDbExists)("segmentation benchmark", () => {
  afterAll(() => {
    report();
    closeDictionaryDb();
  });

  it.each(SEGMENT_BENCHMARK)("'$text'", (testCase: SegmentCase) => {
    const { segments, ms } = segmentWithDictionary(testCase.text);
    totalMs += ms;
    const linkable = segments.filter(isLinkable);

    for (const word of testCase.words) {
      listed += 1;
      const hit = linkable.find((s) => s.text === word);
      if (!hit) {
        misses.push({ text: testCase.text, word, got: segments.map((s) => s.text).join("|") });
        continue;
      }
      const wanted = testCase.resolves?.[word];
      if (wanted && hit.term !== wanted && !hit.entry?.forms.includes(wanted)) {
        misses.push({ text: testCase.text, word, got: `resolved to ${hit.term}` });
        continue;
      }
      found += 1;
    }
  });

  it("finds at least 90% of the listed words", () => {
    expect(listed).toBeGreaterThan(0);
    expect((100 * found) / listed).toBeGreaterThanOrEqual(90);
  });

  it("resolves a sentence in a handful of queries, fast", () => {
    const { queries, ms } = segmentWithDictionary("昨日、駅の近くで新しい本屋を見つけました。");
    expect(queries).toBeLessThanOrEqual(3);
    expect(ms).toBeLessThan(500);
  });

  it("keeps a long paragraph under a second and a few dozen queries", () => {
    const paragraph = SEGMENT_BENCHMARK.map((c) => c.text).join("");
    const { queries, ms } = segmentWithDictionary(paragraph);
    expect(queries).toBeLessThan(40);
    expect(ms).toBeLessThan(1000);
  });
});

function report(): void {
  if (listed === 0) return;
  const lines = [
    "",
    "Segmentation benchmark ——————————————————————————————",
    `  words found     ${found}/${listed} (${((100 * found) / listed).toFixed(1)}%)`,
    `  time            ${totalMs.toFixed(0)}ms across ${SEGMENT_BENCHMARK.length} sentences`,
  ];
  for (const miss of misses) lines.push(`  ✗ ${miss.word} in ${miss.text}\n      ${miss.got}`);
  console.log(lines.join("\n"));
}
