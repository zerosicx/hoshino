/**
 * build-site-demo.ts
 *
 * Builds the small word list behind the live dictionary demo on the marketing
 * site (docs/index.html). It reads assets/hoshino.db read-only and writes
 * docs/demo/words.json: an array of compact rows
 *
 *   [kanjiForm, reading, firstGloss, jlptLevelOrNull, isCommon]
 *
 * for every entry that has a JLPT level or is marked common. The file is kept
 * under roughly 900 KB so the page stays light; if the full set is larger,
 * uncommon words with no JLPT level are dropped first, then uncommon N1 words.
 *
 * Run with: source ~/.nvm/nvm.sh && nvm use && npx tsx scripts/build-site-demo.ts
 */

import Database from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "assets", "hoshino.db");
const OUT_DIR = path.join(ROOT, "docs", "demo");
const OUT_PATH = path.join(OUT_DIR, "words.json");
const SIZE_LIMIT_BYTES = 900_000;

type Row = {
  kanji_forms: string | null;
  reading_forms: string | null;
  senses: string | null;
  jlpt_level: number | null;
  is_common: number | null;
};

/** [kanjiForm, reading, firstGloss, jlptLevelOrNull, isCommon] */
type DemoWord = [string, string, string, number | null, 0 | 1];

function parseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function firstGloss(raw: string | null): string {
  if (!raw) return "";
  try {
    const senses: unknown = JSON.parse(raw);
    if (!Array.isArray(senses) || senses.length === 0) return "";
    const first = senses[0] as { glosses?: unknown };
    if (!Array.isArray(first.glosses) || first.glosses.length === 0) return "";
    return String(first.glosses[0] ?? "");
  } catch {
    return "";
  }
}

function toDemoWord(row: Row): DemoWord | null {
  const kanji = parseStringArray(row.kanji_forms);
  const readings = parseStringArray(row.reading_forms);
  const reading = readings[0];
  if (!reading) return null;
  const head = kanji[0] ?? reading;
  const gloss = firstGloss(row.senses);
  if (!gloss) return null;
  return [head, reading, gloss, row.jlpt_level ?? null, row.is_common === 1 ? 1 : 0];
}

function serialise(words: DemoWord[]): string {
  // Compact JSON: the file is generated, so readability matters less than size.
  return JSON.stringify(words);
}

function main(): void {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Dictionary database not found at ${DB_PATH}. Run npm run build:db first.`);
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });
  const rows = db
    .prepare(
      `SELECT kanji_forms, reading_forms, senses, jlpt_level, is_common
         FROM entries
        WHERE jlpt_level IS NOT NULL OR is_common = 1
        ORDER BY is_common DESC, jlpt_level DESC, id ASC`,
    )
    .all() as Row[];
  db.close();

  let words = rows.map(toDemoWord).filter((w): w is DemoWord => w !== null);
  const total = words.length;

  // Trim in the order the site cares least about until the file fits.
  const dropOrder: Array<(w: DemoWord) => boolean> = [
    (w) => w[4] === 0 && w[3] === null,
    (w) => w[4] === 0 && w[3] === 1,
  ];
  let json = serialise(words);
  for (const shouldDrop of dropOrder) {
    if (Buffer.byteLength(json) <= SIZE_LIMIT_BYTES) break;
    words = words.filter((w) => !shouldDrop(w));
    json = serialise(words);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, json);

  const bytes = Buffer.byteLength(json);
  console.log(`Wrote ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`  ${words.length} words (${total} candidates), ${(bytes / 1024).toFixed(0)} KB`);
  if (bytes > SIZE_LIMIT_BYTES) {
    console.warn(`  Still over the ${SIZE_LIMIT_BYTES / 1024} KB target after trimming.`);
  }
}

main();
