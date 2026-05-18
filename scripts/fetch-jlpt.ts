/**
 * fetch-jlpt.ts
 *
 * Downloads the yomitan-jlpt-vocab dictionary (Jonathan Waller's JLPT lists,
 * mapped to kanji+reading pairs) and matches entries against hoshino.db to
 * produce scripts/sources/jlpt-vocab.json.
 *
 * Format: { "n5": [entry_id, ...], "n4": [...], ..., "n1": [...] }
 *
 * Run with: npx tsx scripts/fetch-jlpt.ts
 * Then:     npm run build:db
 */

import Database from "better-sqlite3";
import AdmZip from "adm-zip";
import * as fs from "node:fs";
import * as path from "node:path";

const SCRIPTS_DIR = path.resolve(import.meta.dirname ?? __dirname);
const SOURCES_DIR = path.join(SCRIPTS_DIR, "sources");
const DB_PATH = path.join(SCRIPTS_DIR, "..", "assets", "hoshino.db");
const OUTPUT_PATH = path.join(SOURCES_DIR, "jlpt-vocab.json");
const ZIP_URL =
  "https://github.com/stephenmk/yomitan-jlpt-vocab/releases/latest/download/jlpt.zip";
const ZIP_CACHE = path.join(SOURCES_DIR, "yomitan-jlpt-vocab.zip");

// [term, "freq", { reading: string, frequency: { value: number, displayValue: "N1" | "N2" | ... } }]
type YomitanEntry = [string, "freq", { reading: string; frequency: { value: number; displayValue: string } }];

async function downloadZip(): Promise<void> {
  if (fs.existsSync(ZIP_CACHE)) {
    console.log(`[SKIP] Already downloaded ${path.basename(ZIP_CACHE)}`);
    return;
  }
  console.log(`[1/3] Downloading yomitan-jlpt-vocab…`);
  const res = await fetch(ZIP_URL, { headers: { "User-Agent": "hoshino-build" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${ZIP_URL}`);
  const buf = await res.arrayBuffer();
  fs.writeFileSync(ZIP_CACHE, Buffer.from(buf));
  console.log(`      Saved (${(buf.byteLength / 1024).toFixed(0)} KB)`);
}

function parseBanks(): Map<string, string> {
  // Returns Map<"term|reading", "n1" | "n2" | ...>
  console.log("[2/3] Parsing JLPT term banks…");
  const zip = new AdmZip(ZIP_CACHE);
  const banks = zip
    .getEntries()
    .filter((e) => e.entryName.startsWith("term_meta_bank_"))
    .sort((a, b) => a.entryName.localeCompare(b.entryName));

  const result = new Map<string, string>();
  const levelMap: Record<string, string> = {
    N5: "n5", N4: "n4", N3: "n3", N2: "n2", N1: "n1",
  };

  for (const bank of banks) {
    const entries: YomitanEntry[] = JSON.parse(bank.getData().toString("utf8"));
    for (const [term, type, meta] of entries) {
      if (type !== "freq") continue;
      const displayValue = meta?.frequency?.displayValue;
      const level = levelMap[displayValue];
      if (!level) continue;
      const key = `${term}|${meta.reading}`;
      // Keep the highest (easiest) level if there are duplicates
      const existing = result.get(key);
      if (!existing || parseInt(existing[1]) > parseInt(level[1])) {
        result.set(key, level);
      }
    }
  }

  const counts: Record<string, number> = { n5: 0, n4: 0, n3: 0, n2: 0, n1: 0 };
  for (const l of result.values()) counts[l]++;
  console.log(
    `      Loaded ${result.size} term+reading pairs: N5=${counts.n5} N4=${counts.n4} N3=${counts.n3} N2=${counts.n2} N1=${counts.n1}`
  );
  return result;
}

function matchToDb(termMap: Map<string, string>): Record<string, number[]> {
  console.log("[3/3] Matching to hoshino.db entries…");

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(
      `Database not found at ${DB_PATH}.\nRun 'npm run build:db' first.`
    );
  }

  const db = new Database(DB_PATH, { readonly: true });

  // Build a lookup: kanji_form -> [entry_id, ...] and reading_form -> [entry_id, ...]
  // We'll match on (first kanji form OR reading-only) + (first reading form)
  const rows = db
    .prepare(
      `SELECT id, kanji_forms, reading_forms FROM entries`
    )
    .all() as { id: number; kanji_forms: string; reading_forms: string }[];

  db.close();

  // Index by "term|reading" where term is the first kanji form (or first reading if no kanji)
  const dbIndex = new Map<string, number>();
  for (const row of rows) {
    const kanji: string[] = JSON.parse(row.kanji_forms);
    const readings: string[] = JSON.parse(row.reading_forms);
    const firstReading = readings[0] ?? "";

    if (kanji.length > 0) {
      for (const k of kanji) {
        const key = `${k}|${firstReading}`;
        if (!dbIndex.has(key)) dbIndex.set(key, row.id);
      }
    } else {
      // Kana-only entry
      const key = `${firstReading}|${firstReading}`;
      if (!dbIndex.has(key)) dbIndex.set(key, row.id);
    }
  }

  const result: Record<string, number[]> = { n5: [], n4: [], n3: [], n2: [], n1: [] };
  let matched = 0;
  let unmatched = 0;

  for (const [termReading, level] of termMap) {
    const id = dbIndex.get(termReading);
    if (id !== undefined) {
      result[level].push(id);
      matched++;
    } else {
      // Try kana-only match (term == reading)
      const [term, reading] = termReading.split("|");
      const kanaKey = `${reading}|${reading}`;
      const kanaId = dbIndex.get(kanaKey);
      if (kanaId !== undefined) {
        result[level].push(kanaId);
        matched++;
      } else {
        unmatched++;
      }
    }
  }

  console.log(`      Matched: ${matched} | Unmatched: ${unmatched}`);
  console.log(
    `      N5=${result.n5.length} N4=${result.n4.length} N3=${result.n3.length} N2=${result.n2.length} N1=${result.n1.length}`
  );
  return result;
}

async function main(): Promise<void> {
  fs.mkdirSync(SOURCES_DIR, { recursive: true });

  if (fs.existsSync(OUTPUT_PATH)) {
    console.log(`[SKIP] ${OUTPUT_PATH} already exists. Delete it to re-fetch.`);
    return;
  }

  await downloadZip();
  const termMap = parseBanks();
  const result = matchToDb(termMap);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`\n✓ Saved to ${OUTPUT_PATH}`);
  console.log(`  Run 'npm run build:db' to rebuild hoshino.db with JLPT levels.`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
