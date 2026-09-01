import { afterAll, describe, expect, it } from "vitest";
import { conjugate } from "@/utils/conjugation";
import { parseJsonArray, parseSenses } from "@/utils/entryJson";
import { classifySenses } from "@/utils/wordClass";
import {
  closeDictionaryDb,
  dictionaryDbExists,
  openDictionaryDb,
} from "@/tests/dictionaryDb";

/**
 * Exercises the chain the word detail screen depends on: raw POS strings from
 * the database, through classification, into conjugated forms. The unit tests
 * feed this chain hand-written input; this one feeds it the real thing.
 */

interface Row {
  kanji_forms: string | null;
  reading_forms: string | null;
  senses: string | null;
}

function lookup(headword: string) {
  const row = openDictionaryDb()
    .prepare(
      `SELECT kanji_forms, reading_forms, senses FROM entries
       WHERE instr(COALESCE(kanji_forms,'') || COALESCE(reading_forms,''), ?) > 0
       ORDER BY is_common DESC, COALESCE(jlpt_level, 0) DESC
       LIMIT 1`
    )
    .get(`"${headword}"`) as Row | undefined;

  if (!row) throw new Error(`no entry for ${headword}`);

  const senses = parseSenses(row.senses);
  const info = classifySenses(senses);
  const written = parseJsonArray(row.kanji_forms)[0] ?? headword;
  const reading = parseJsonArray(row.reading_forms)[0] ?? "";

  return { info, written, reading };
}

function formsFor(headword: string): Record<string, string> {
  const { info, written, reading } = lookup(headword);
  if (!info) throw new Error(`${headword} was not classified`);

  const out: Record<string, string> = {};
  for (const group of conjugate(written, reading, info.wordClass)) {
    for (const form of group.forms) out[`${group.title} / ${form.name}`] = form.written;
  }
  return out;
}

describe.skipIf(!dictionaryDbExists)("conjugation from real entries", () => {
  afterAll(closeDictionaryDb);

  it("classifies 食べる from its database row", () => {
    const { info } = lookup("食べる");
    expect(info?.wordClass).toBe("ichidan");
    expect(info?.group).toBe("ru-verb");
    expect(info?.transitivity).toBe("transitive");
  });

  it("classifies 行く as intransitive", () => {
    const { info } = lookup("行く");
    expect(info?.transitivity).toBe("intransitive");
  });

  it.each([
    ["食べる", "Plain / Past", "食べた"],
    ["食べる", "Polite / Past negative", "食べませんでした"],
    ["食べる", "Potential / Can do", "食べられる"],
    ["飲む", "Plain / Past", "飲んだ"],
    ["飲む", "Polite / Present", "飲みます"],
    ["買う", "Plain / Negative", "買わない"],
    ["書く", "Te-form and conditional / Te-form", "書いて"],
    ["泳ぐ", "Plain / Past", "泳いだ"],
    ["話す", "Plain / Past", "話した"],
    ["待つ", "Plain / Past", "待った"],
    ["遊ぶ", "Plain / Past", "遊んだ"],
    ["走る", "Plain / Past", "走った"],
    ["高い", "Plain / Past", "高かった"],
    ["高い", "Plain / Negative", "高くない"],
  ])("%s: %s is %s", (headword, key, expected) => {
    expect(formsFor(headword)[key]).toBe(expected);
  });

  it("shows what the detail screen renders for 食べる", () => {
    const { info, written, reading } = lookup("食べる");
    const groups = conjugate(written, reading, info!.wordClass);

    const lines = groups.map(
      (g) =>
        `  ${g.title.padEnd(28)} ${g.forms
          .map((f) => `${f.name}: ${f.written}`)
          .join("   ")}`
    );
    console.log(
      ["", `食べる — ${info!.label} (${info!.group}), ${info!.transitivity}`, ...lines, ""].join("\n")
    );

    expect(groups.length).toBeGreaterThan(0);
  });
});
