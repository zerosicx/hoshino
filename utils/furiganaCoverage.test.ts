import { afterAll, describe, expect, it } from "vitest";
import { annotateSentence, buildReadingIndex } from "@/utils/furigana";
import {
  closeDictionaryDb,
  dictionaryDbExists,
  openDictionaryDb,
} from "@/tests/dictionaryDb";

/**
 * Furigana on example sentences is only as good as the readings Tatoeba's
 * token data can supply. This measures that against the real corpus, so a
 * change to the alignment rules cannot quietly reduce what the user sees.
 */

const isKanji = (char: string): boolean => /[\u4E00-\u9FFF\u3005]/.test(char);

interface ExampleRow {
  japanese: string;
  tokens: string | null;
}

interface EntryRow {
  id: number;
  kanji_forms: string | null;
  reading_forms: string | null;
}

function measure() {
  const db = openDictionaryDb();

  const rows = db
    .prepare(
      `SELECT ex.japanese, ex.tokens
       FROM entry_examples ee JOIN examples ex ON ex.id = ee.example_id
       WHERE ex.tokens IS NOT NULL AND ex.tokens != '[]'
       LIMIT 4000`
    )
    .all() as ExampleRow[];

  const lookup = db.prepare(
    `SELECT id, kanji_forms, reading_forms FROM entries WHERE id = ?`
  );
  const cache = new Map<number, { written: string; reading: string }[]>();

  const spellingsFor = (id: number) => {
    const hit = cache.get(id);
    if (hit) return hit;
    const row = lookup.get(id) as EntryRow | undefined;
    const readings: string[] = JSON.parse(row?.reading_forms ?? "[]");
    const written: string[] = JSON.parse(row?.kanji_forms ?? "[]");
    const pairs =
      readings.length > 0
        ? written.map((w) => ({ written: w, reading: readings[0] }))
        : [];
    cache.set(id, pairs);
    return pairs;
  };

  let kanjiTotal = 0;
  let kanjiAnnotated = 0;
  let sentencesWithKanji = 0;
  let sentencesFullyAnnotated = 0;
  const samples: string[] = [];

  for (const row of rows) {
    const tokens = JSON.parse(row.tokens ?? "[]") as {
      entry_id: number | null;
    }[];

    const index = buildReadingIndex(
      tokens.flatMap((t) => (t.entry_id != null ? spellingsFor(t.entry_id) : []))
    );
    const pairs = annotateSentence(row.japanese, index);

    let total = 0;
    let annotated = 0;
    for (const pair of pairs) {
      for (const char of pair.base) {
        if (!isKanji(char)) continue;
        total++;
        if (pair.reading) annotated++;
      }
    }

    if (total === 0) continue;
    sentencesWithKanji++;
    kanjiTotal += total;
    kanjiAnnotated += annotated;
    if (total === annotated) sentencesFullyAnnotated++;

    if (samples.length < 10) {
      samples.push(
        pairs
          .map((p) => (p.reading ? `${p.base}(${p.reading})` : p.base))
          .join("")
      );
    }
  }

  return {
    kanjiTotal,
    kanjiAnnotated,
    sentencesWithKanji,
    sentencesFullyAnnotated,
    samples,
  };
}

describe.skipIf(!dictionaryDbExists)("furigana coverage", () => {
  const result = measure();

  afterAll(closeDictionaryDb);

  it("reports coverage", () => {
    const kanjiPct = (100 * result.kanjiAnnotated) / result.kanjiTotal;
    const sentencePct =
      (100 * result.sentencesFullyAnnotated) / result.sentencesWithKanji;

    console.log(
      [
        "",
        "Furigana coverage ——————————————————————————————————",
        `  kanji annotated            ${kanjiPct.toFixed(1)}% (${result.kanjiAnnotated}/${result.kanjiTotal})`,
        `  sentences fully annotated  ${sentencePct.toFixed(1)}% (${result.sentencesFullyAnnotated}/${result.sentencesWithKanji})`,
        "",
        ...result.samples.map((s) => `  ${s}`),
        "————————————————————————————————————————————————————",
        "",
      ].join("\n")
    );

    expect(result.kanjiTotal).toBeGreaterThan(0);
  });

  it("annotates nearly every kanji in example sentences", () => {
    const pct = (100 * result.kanjiAnnotated) / result.kanjiTotal;
    expect(pct).toBeGreaterThan(95);
  });

  it("leaves almost no sentence partly annotated", () => {
    const pct =
      (100 * result.sentencesFullyAnnotated) / result.sentencesWithKanji;
    expect(pct).toBeGreaterThan(90);
  });
});
