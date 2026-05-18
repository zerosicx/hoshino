/**
 * Hoshino Dictionary Build Pipeline
 *
 * Generates assets/hoshino.db from raw source files in scripts/sources/.
 * Run with: npm run build:db
 * (which calls: tsx scripts/build-dictionary.ts)
 */

import Database from "better-sqlite3";
import { XMLParser } from "fast-xml-parser";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SCRIPTS_DIR = path.resolve(import.meta.dirname ?? __dirname);
const SOURCES_DIR = path.join(SCRIPTS_DIR, "sources");
const REPO_ROOT = path.resolve(SCRIPTS_DIR, "..");
const OUTPUT_PATH = path.join(REPO_ROOT, "assets", "hoshino.db");

const JMDICT_PATH = path.join(SOURCES_DIR, "JMdict_e.xml");
const KANJIDIC_PATH = path.join(SOURCES_DIR, "kanjidic2.xml");
const JPN_SENTENCES_PATH = path.join(SOURCES_DIR, "jpn_sentences.tsv");
const ENG_SENTENCES_PATH = path.join(SOURCES_DIR, "eng_sentences.tsv");
const LINKS_PATH = path.join(SOURCES_DIR, "links.csv");
const JPN_INDICES_PATH = path.join(SOURCES_DIR, "jpn_indices.csv");
const JLPT_VOCAB_PATH = path.join(SOURCES_DIR, "jlpt-vocab.json");

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

interface JMdictKanjiElement {
  keb: string | string[];
  ke_pri?: string | string[];
  ke_inf?: string | string[];
}

interface JMdictReadingElement {
  reb: string | string[];
  re_pri?: string | string[];
  re_inf?: string | string[];
  re_nokanji?: string;
}

interface JMdictGloss {
  "#text"?: string;
  "@_xml:lang"?: string;
  "@_g_type"?: string;
}

interface JMdictSense {
  gloss?: JMdictGloss | JMdictGloss[] | string | string[];
  pos?: string | string[];
  misc?: string | string[];
  s_inf?: string | string[];
  field?: string | string[];
  dial?: string | string[];
  xref?: string | string[];
  ant?: string | string[];
}

interface JMdictEntry {
  ent_seq: number;
  k_ele?: JMdictKanjiElement | JMdictKanjiElement[];
  r_ele: JMdictReadingElement | JMdictReadingElement[];
  sense: JMdictSense | JMdictSense[];
}

interface ParsedEntry {
  id: number;
  kanji_forms: string[];
  reading_forms: string[];
  senses: ParsedSense[];
  is_common: number;
  jlpt_level: number | null;
  conjugation_class: string | null;
  tags: string[];
}

interface ParsedSense {
  glosses: string[];
  pos: string[];
  misc: string[];
  info: string[];
}

interface KanjidicReading {
  "#text": string;
  "@_r_type": string;
}

interface KanjidicMiscGroup {
  grade?: number;
  stroke_count?: number | number[];
  freq?: number;
  jlpt?: number;
  rad_name?: string | string[];
}

interface KanjidicReadingMeaning {
  rmgroup?: KanjidicRmGroup | KanjidicRmGroup[];
  nanori?: string | string[];
}

interface KanjidicRmGroup {
  reading?: KanjidicReading | KanjidicReading[];
  meaning?: string | { "#text": string; "@_m_lang": string } | (string | { "#text": string; "@_m_lang": string })[];
}

interface KanjidicCharacter {
  literal: string;
  codepoint?: unknown;
  radical?: {
    rad_value?: { "#text": number; "@_rad_type": string } | { "#text": number; "@_rad_type": string }[];
  };
  misc?: KanjidicMiscGroup;
  reading_meaning?: KanjidicReadingMeaning;
}

interface ParsedKanji {
  character: string;
  meanings: string[];
  on_readings: string[];
  kun_readings: string[];
  jlpt_level: number | null;
  grade: number | null;
  stroke_count: number | null;
  radicals: string[];
  frequency: number | null;
}

interface TatoebaExample {
  id: number;
  japanese: string;
  english: string;
  tokens: TatoebaToken[];
}

interface TatoebaToken {
  surface: string;
  reading: string;
  entry_id: number | null;
}

interface JlptVocabFile {
  n1?: number[];
  n2?: number[];
  n3?: number[];
  n4?: number[];
  n5?: number[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

function fileExists(p: string): boolean {
  return fs.existsSync(p);
}

/** Parse a priority tag value: returns true if it indicates a common word */
function isCommonPri(pri: string): boolean {
  return pri === "ichi1" || pri === "news1" || pri === "spec1";
}

// ---------------------------------------------------------------------------
// JMdict POS → internal conjugation class mapping
// ---------------------------------------------------------------------------

const POS_TO_CONJUGATION: Record<string, string> = {
  "v5u": "godan-u",
  "v5k": "godan-ku",
  "v5g": "godan-gu",
  "v5s": "godan-su",
  "v5t": "godan-tsu",
  "v5n": "godan-nu",
  "v5b": "godan-bu",
  "v5m": "godan-mu",
  "v5r": "godan-ru",
  "v5r-i": "godan-ru-irreg",
  "v5aru": "godan-aru",
  "v5uru": "godan-uru",
  "v5k-s": "godan-kuru",
  "v1": "ichidan",
  "v1-s": "ichidan-kure",
  "vk": "kuru",
  "vs": "suru-noun",
  "vs-s": "suru-special",
  "vs-i": "suru-i",
  "vs-c": "suru-c",
  "vz": "zuru",
  "vi": "intransitive",
  "vt": "transitive",
  "v2a-s": "nidan-as",
  "v4r": "yodan-r",
  "vn": "nu-irregular",
  "vr": "ru-irregular",
  "adj-i": "i-adj",
  "adj-ix": "i-adj-ii",
  "adj-na": "na-adj",
};

function detectConjugationClass(posTags: string[]): string | null {
  for (const pos of posTags) {
    const mapped = POS_TO_CONJUGATION[pos];
    if (mapped) return mapped;
  }
  return null;
}

// ---------------------------------------------------------------------------
// JLPT detection from misc tags
// ---------------------------------------------------------------------------

function detectJlptFromMisc(miscTags: string[]): number | null {
  for (const tag of miscTags) {
    if (tag === "jlpt-n1") return 1;
    if (tag === "jlpt-n2") return 2;
    if (tag === "jlpt-n3") return 3;
    if (tag === "jlpt-n4") return 4;
    if (tag === "jlpt-n5") return 5;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Phase 1: Parse JMdict
// ---------------------------------------------------------------------------

function parseJMdict(db: Database.Database): void {
  if (!fileExists(JMDICT_PATH)) {
    console.warn(
      `[WARN] JMdict source not found at ${JMDICT_PATH}. Skipping Phase 1.`
    );
    console.warn(`       Run ./scripts/download-sources.sh to fetch sources.`);
    return;
  }

  console.log("[Phase 1] Parsing JMdict…");
  console.time("Phase 1");

  const xml = fs.readFileSync(JMDICT_PATH, "utf-8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: { enabled: true, maxTotalExpansions: 100_000_000, maxExpandedLength: 100_000_000 },
    isArray: (tagName) => {
      // These elements can appear multiple times
      return [
        "entry",
        "k_ele",
        "r_ele",
        "sense",
        "gloss",
        "pos",
        "misc",
        "s_inf",
        "field",
        "dial",
        "xref",
        "ant",
        "ke_pri",
        "re_pri",
        "ke_inf",
        "re_inf",
      ].includes(tagName);
    },
    parseTagValue: true,
    trimValues: true,
  });

  console.log("[Phase 1] XML file read, parsing…");
  const parsed = parser.parse(xml);
  const entries: JMdictEntry[] = parsed?.JMdict?.entry ?? [];
  console.log(`[Phase 1] Found ${entries.length} entries to process`);

  const insertEntry = db.prepare(`
    INSERT OR REPLACE INTO entries
      (id, kanji_forms, reading_forms, senses, jlpt_level, is_common, conjugation_class, tags)
    VALUES
      (@id, @kanji_forms, @reading_forms, @senses, @jlpt_level, @is_common, @conjugation_class, @tags)
  `);

  const insertMany = db.transaction((batch: ParsedEntry[]) => {
    for (const e of batch) {
      insertEntry.run({
        id: e.id,
        kanji_forms: JSON.stringify(e.kanji_forms),
        reading_forms: JSON.stringify(e.reading_forms),
        senses: JSON.stringify(e.senses),
        jlpt_level: e.jlpt_level,
        is_common: e.is_common,
        conjugation_class: e.conjugation_class,
        tags: JSON.stringify(e.tags),
      });
    }
  });

  let batch: ParsedEntry[] = [];
  let total = 0;

  for (const entry of entries) {
    const id = Number(entry.ent_seq);

    // Kanji forms
    const kElements = toArray(entry.k_ele);
    const kanji_forms = kElements.map((k) =>
      typeof k.keb === "string" ? k.keb : String(k.keb)
    );

    // Reading forms
    const rElements = toArray(entry.r_ele);
    const reading_forms = rElements.map((r) =>
      typeof r.reb === "string" ? r.reb : String(r.reb)
    );

    // Detect is_common from ke_pri / re_pri
    let is_common = 0;
    for (const k of kElements) {
      for (const pri of toArray(k.ke_pri)) {
        if (isCommonPri(String(pri))) {
          is_common = 1;
          break;
        }
      }
      if (is_common) break;
    }
    if (!is_common) {
      for (const r of rElements) {
        for (const pri of toArray(r.re_pri)) {
          if (isCommonPri(String(pri))) {
            is_common = 1;
            break;
          }
        }
        if (is_common) break;
      }
    }

    // Parse senses
    const rawSenses = toArray(entry.sense);
    let jlpt_level: number | null = null;
    const allPosTags: string[] = [];

    const senses: ParsedSense[] = rawSenses.map((s) => {
      const glosses: string[] = [];
      for (const g of toArray(s.gloss)) {
        if (typeof g === "string") {
          glosses.push(g);
        } else if (typeof g === "object" && g !== null) {
          const gObj = g as JMdictGloss;
          // Only include English glosses (no xml:lang attribute = English)
          if (!gObj["@_xml:lang"] && gObj["#text"]) {
            glosses.push(gObj["#text"]);
          }
        }
      }

      const pos = toArray(s.pos).map(String);
      allPosTags.push(...pos);

      const misc = toArray(s.misc).map(String);
      const info = toArray(s.s_inf).map(String);

      // Try to extract JLPT from misc
      if (jlpt_level === null) {
        jlpt_level = detectJlptFromMisc(misc);
      }

      return { glosses, pos, misc, info };
    });

    const conjugation_class = detectConjugationClass(allPosTags);
    const tags: string[] = [];

    batch.push({
      id,
      kanji_forms,
      reading_forms,
      senses,
      is_common,
      jlpt_level,
      conjugation_class,
      tags,
    });

    if (batch.length >= 1000) {
      insertMany(batch);
      total += batch.length;
      batch = [];
      if (total % 10000 === 0) {
        process.stdout.write(`\r[Phase 1] Inserted ${total} entries…`);
      }
    }
  }

  if (batch.length > 0) {
    insertMany(batch);
    total += batch.length;
  }

  process.stdout.write(`\r[Phase 1] Inserted ${total} entries total.\n`);
  console.timeEnd("Phase 1");
}

// ---------------------------------------------------------------------------
// Phase 2: Parse KANJIDIC2
// ---------------------------------------------------------------------------

function parseKanjidic(db: Database.Database): void {
  if (!fileExists(KANJIDIC_PATH)) {
    console.warn(
      `[WARN] KANJIDIC2 source not found at ${KANJIDIC_PATH}. Skipping Phase 2.`
    );
    return;
  }

  console.log("[Phase 2] Parsing KANJIDIC2…");
  console.time("Phase 2");

  const xml = fs.readFileSync(KANJIDIC_PATH, "utf-8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (tagName) =>
      ["character", "reading", "meaning", "rad_value", "stroke_count"].includes(
        tagName
      ),
    parseTagValue: true,
    trimValues: true,
  });

  const parsed = parser.parse(xml);
  const characters: KanjidicCharacter[] =
    parsed?.kanjidic2?.character ?? [];

  console.log(`[Phase 2] Found ${characters.length} kanji to process`);

  const insertKanji = db.prepare(`
    INSERT OR REPLACE INTO kanji
      (character, meanings, on_readings, kun_readings, jlpt_level, grade, stroke_count, radicals, frequency)
    VALUES
      (@character, @meanings, @on_readings, @kun_readings, @jlpt_level, @grade, @stroke_count, @radicals, @frequency)
  `);

  const insertMany = db.transaction((batch: ParsedKanji[]) => {
    for (const k of batch) {
      insertKanji.run({
        character: k.character,
        meanings: JSON.stringify(k.meanings),
        on_readings: JSON.stringify(k.on_readings),
        kun_readings: JSON.stringify(k.kun_readings),
        jlpt_level: k.jlpt_level,
        grade: k.grade,
        stroke_count: k.stroke_count,
        radicals: JSON.stringify(k.radicals),
        frequency: k.frequency,
      });
    }
  });

  let batch: ParsedKanji[] = [];
  let total = 0;

  for (const char of characters) {
    const literal = String(char.literal);

    // Radicals
    const radValues = toArray(char.radical?.rad_value);
    const radicals = radValues
      .filter((rv) => rv["@_rad_type"] === "classical")
      .map((rv) => String(rv["#text"]));

    // Misc data
    const misc = char.misc ?? {};
    const grade = misc.grade !== undefined ? Number(misc.grade) : null;
    const strokeCounts = toArray(misc.stroke_count);
    const stroke_count =
      strokeCounts.length > 0 ? Number(strokeCounts[0]) : null;
    const frequency = misc.freq !== undefined ? Number(misc.freq) : null;
    const jlpt_level = misc.jlpt !== undefined ? Number(misc.jlpt) : null;

    // Readings and meanings
    const rmGroup = char.reading_meaning;
    const rmGroups = toArray(rmGroup?.rmgroup);

    const on_readings: string[] = [];
    const kun_readings: string[] = [];
    const meanings: string[] = [];

    for (const grp of rmGroups) {
      for (const r of toArray(grp.reading)) {
        const rObj = r as KanjidicReading;
        if (rObj["@_r_type"] === "ja_on") on_readings.push(rObj["#text"]);
        else if (rObj["@_r_type"] === "ja_kun") kun_readings.push(rObj["#text"]);
      }
      for (const m of toArray(grp.meaning)) {
        if (typeof m === "string") {
          meanings.push(m);
        } else if (typeof m === "object" && m !== null) {
          const mObj = m as { "#text": string; "@_m_lang"?: string };
          // Only English meanings have no m_lang attribute
          if (!mObj["@_m_lang"] && mObj["#text"]) {
            meanings.push(mObj["#text"]);
          }
        }
      }
    }

    batch.push({
      character: literal,
      meanings,
      on_readings,
      kun_readings,
      jlpt_level,
      grade,
      stroke_count,
      radicals,
      frequency,
    });

    if (batch.length >= 1000) {
      insertMany(batch);
      total += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    insertMany(batch);
    total += batch.length;
  }

  console.log(`[Phase 2] Inserted ${total} kanji.`);
  console.timeEnd("Phase 2");
}

// ---------------------------------------------------------------------------
// Phase 3: Parse Tatoeba
// ---------------------------------------------------------------------------

async function parseTatoeba(db: Database.Database): Promise<void> {
  const missingFiles: string[] = [];
  if (!fileExists(JPN_SENTENCES_PATH)) missingFiles.push("jpn_sentences.tsv");
  if (!fileExists(ENG_SENTENCES_PATH)) missingFiles.push("eng_sentences.tsv");
  if (!fileExists(LINKS_PATH)) missingFiles.push("links.csv");
  if (!fileExists(JPN_INDICES_PATH)) missingFiles.push("jpn_indices.csv");

  if (missingFiles.length > 0) {
    console.warn(
      `[WARN] Tatoeba source files missing: ${missingFiles.join(", ")}. Skipping Phase 3.`
    );
    return;
  }

  console.log("[Phase 3] Parsing Tatoeba examples…");
  console.time("Phase 3");

  // Step 3a: Load Japanese sentences into memory (id → text)
  console.log("[Phase 3] Loading Japanese sentences…");
  const jpnSentences = new Map<number, string>();

  await processLineByLine(JPN_SENTENCES_PATH, (line) => {
    const parts = line.split("\t");
    if (parts.length < 3) return;
    const id = parseInt(parts[0], 10);
    // parts[1] is lang (jpn), parts[2] is text
    if (!isNaN(id)) {
      jpnSentences.set(id, parts[2]);
    }
  });
  console.log(`[Phase 3] Loaded ${jpnSentences.size} Japanese sentences.`);

  // Step 3b: Load English sentences into memory (id → text)
  console.log("[Phase 3] Loading English sentences…");
  const engSentences = new Map<number, string>();

  await processLineByLine(ENG_SENTENCES_PATH, (line) => {
    const parts = line.split("\t");
    if (parts.length < 3) return;
    const id = parseInt(parts[0], 10);
    if (!isNaN(id)) {
      engSentences.set(id, parts[2]);
    }
  });
  console.log(`[Phase 3] Loaded ${engSentences.size} English sentences.`);

  // Step 3c: Build JP→EN link map from links.csv
  // links.csv: sentence_id \t translation_id
  // We only need JP sentence IDs mapped to their English translations
  console.log("[Phase 3] Loading sentence links…");
  const jpnToEng = new Map<number, number>();

  await processLineByLine(LINKS_PATH, (line) => {
    const parts = line.split("\t");
    if (parts.length < 2) return;
    const src = parseInt(parts[0], 10);
    const dst = parseInt(parts[1], 10);
    if (isNaN(src) || isNaN(dst)) return;

    // If src is a known Japanese sentence and dst is a known English sentence
    if (jpnSentences.has(src) && engSentences.has(dst)) {
      if (!jpnToEng.has(src)) {
        jpnToEng.set(src, dst);
      }
    }
  });
  console.log(
    `[Phase 3] Built ${jpnToEng.size} JP→EN sentence links.`
  );

  // Step 3d: Parse jpn_indices.csv to link sentences to JMdict entries
  // Format: sent_id \t entry_form \t A[entry_id]/B[entry_id]/...
  console.log("[Phase 3] Loading jpn_indices…");

  const sentenceTokens = new Map<number, TatoebaToken[]>();

  await processLineByLine(JPN_INDICES_PATH, (line) => {
    const parts = line.split("\t");
    if (parts.length < 3) return;
    const sentId = parseInt(parts[0], 10);
    if (isNaN(sentId)) return;

    const surface = parts[1] ?? "";
    const indexStr = parts[2] ?? "";

    // Parse entry IDs from format like "A[1234567]/B[7654321]"
    let entry_id: number | null = null;
    const match = indexStr.match(/[A-Z]\[(\d+)\]/);
    if (match) {
      entry_id = parseInt(match[1], 10);
    }

    const token: TatoebaToken = { surface, reading: "", entry_id };
    const existing = sentenceTokens.get(sentId);
    if (existing) {
      existing.push(token);
    } else {
      sentenceTokens.set(sentId, [token]);
    }
  });
  console.log(
    `[Phase 3] Loaded index data for ${sentenceTokens.size} sentences.`
  );

  // Step 3e: Insert examples
  const insertExample = db.prepare(`
    INSERT INTO examples (id, japanese, english, tokens)
    VALUES (@id, @japanese, @english, @tokens)
  `);

  const insertEntryExample = db.prepare(`
    INSERT OR IGNORE INTO entry_examples (entry_id, example_id)
    VALUES (@entry_id, @example_id)
  `);

  const insertBatch = db.transaction(
    (examples: TatoebaExample[], entryLinks: Array<{ entry_id: number; example_id: number }>) => {
      for (const ex of examples) {
        insertExample.run({
          id: ex.id,
          japanese: ex.japanese,
          english: ex.english,
          tokens: JSON.stringify(ex.tokens),
        });
      }
      for (const link of entryLinks) {
        insertEntryExample.run(link);
      }
    }
  );

  let exBatch: TatoebaExample[] = [];
  let linkBatch: Array<{ entry_id: number; example_id: number }> = [];
  let total = 0;
  const BATCH_SIZE = 500;

  for (const [jpnId, japanese] of jpnSentences) {
    const engId = jpnToEng.get(jpnId);
    if (!engId) continue; // No English translation available

    const english = engSentences.get(engId);
    if (!english) continue;

    const tokens = sentenceTokens.get(jpnId) ?? [];

    exBatch.push({ id: jpnId, japanese, english, tokens });

    // Collect unique entry_ids for this sentence
    const seenEntries = new Set<number>();
    for (const tok of tokens) {
      if (tok.entry_id !== null && !seenEntries.has(tok.entry_id)) {
        seenEntries.add(tok.entry_id);
        linkBatch.push({ entry_id: tok.entry_id, example_id: jpnId });
      }
    }

    if (exBatch.length >= BATCH_SIZE) {
      insertBatch(exBatch, linkBatch);
      total += exBatch.length;
      exBatch = [];
      linkBatch = [];
      if (total % 10000 === 0) {
        process.stdout.write(`\r[Phase 3] Inserted ${total} examples…`);
      }
    }
  }

  if (exBatch.length > 0) {
    insertBatch(exBatch, linkBatch);
    total += exBatch.length;
  }

  process.stdout.write(`\r[Phase 3] Inserted ${total} examples total.\n`);
  console.timeEnd("Phase 3");
}

/** Read a file line by line using readline (memory-efficient for large files) */
async function processLineByLine(
  filePath: string,
  onLine: (line: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: "utf-8" }),
      crlfDelay: Infinity,
    });
    rl.on("line", onLine);
    rl.on("close", resolve);
    rl.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Phase 4: Apply JLPT levels from supplementary vocab file
// ---------------------------------------------------------------------------

function applyJlptLevels(db: Database.Database): void {
  if (!fileExists(JLPT_VOCAB_PATH)) {
    console.warn(
      `[WARN] Optional JLPT vocab file not found at ${JLPT_VOCAB_PATH}. Skipping Phase 4.`
    );
    console.warn(
      `       To improve JLPT level accuracy, create this file with format: { "n5": [id, ...], "n4": [...], ... }`
    );
    return;
  }

  console.log("[Phase 4] Applying JLPT levels from supplementary vocab file…");
  console.time("Phase 4");

  let vocab: JlptVocabFile;
  try {
    const raw = fs.readFileSync(JLPT_VOCAB_PATH, "utf-8");
    vocab = JSON.parse(raw) as JlptVocabFile;
  } catch (err) {
    console.error(`[ERROR] Failed to parse jlpt-vocab.json: ${err}`);
    return;
  }

  const update = db.prepare(
    `UPDATE entries SET jlpt_level = @level WHERE id = @id`
  );

  const applyLevel = db.transaction((ids: number[], level: number) => {
    for (const id of ids) {
      update.run({ level, id });
    }
  });

  const levelMap: [keyof JlptVocabFile, number][] = [
    ["n1", 1],
    ["n2", 2],
    ["n3", 3],
    ["n4", 4],
    ["n5", 5],
  ];

  let total = 0;
  for (const [key, level] of levelMap) {
    const ids = vocab[key] ?? [];
    if (ids.length > 0) {
      applyLevel(ids, level);
      console.log(`[Phase 4] Set JLPT N${level} for ${ids.length} entries.`);
      total += ids.length;
    }
  }

  console.log(`[Phase 4] Updated ${total} entries with JLPT levels.`);
  console.timeEnd("Phase 4");
}

// ---------------------------------------------------------------------------
// Phase 5: Seed JLPT lists
// ---------------------------------------------------------------------------

function seedJlptLists(db: Database.Database): void {
  console.log("[Phase 5] Seeding JLPT lists…");
  console.time("Phase 5");

  const now = new Date().toISOString();

  const insertList = db.prepare(`
    INSERT INTO lists (name, type, jlpt_level, created_at)
    VALUES (@name, @type, @jlpt_level, @created_at)
  `);

  const insertListItem = db.prepare(`
    INSERT OR IGNORE INTO list_items (list_id, entry_id, added_at)
    VALUES (@list_id, @entry_id, @added_at)
  `);

  interface ListDef {
    name: string;
    type: "jlpt";
    jlpt_level: number;
    kind: "vocab" | "kanji";
  }

  const listDefs: ListDef[] = [5, 4, 3, 2, 1].flatMap((n) => [
    { name: `JLPT N${n} Vocabulary`, type: "jlpt" as const, jlpt_level: n, kind: "vocab" as const },
    { name: `JLPT N${n} Kanji`, type: "jlpt" as const, jlpt_level: n, kind: "kanji" as const },
  ]);

  const seedAll = db.transaction(() => {
    for (const def of listDefs) {
      const result = insertList.run({
        name: def.name,
        type: def.type,
        jlpt_level: def.jlpt_level,
        created_at: now,
      });
      const listId = result.lastInsertRowid as number;

      if (def.kind === "vocab") {
        // Populate from entries table where jlpt_level matches
        const entries = db
          .prepare(
            `SELECT id FROM entries WHERE jlpt_level = ? LIMIT 10000`
          )
          .all(def.jlpt_level) as Array<{ id: number }>;

        for (const entry of entries) {
          insertListItem.run({
            list_id: listId,
            entry_id: entry.id,
            added_at: now,
          });
        }
        console.log(
          `[Phase 5] ${def.name}: ${entries.length} vocab entries added.`
        );
      } else {
        // Kanji list: reference entries that are single-kanji dictionary entries
        // TODO: A more complete approach would maintain a separate kanji→entry_id mapping.
        // For now, we look for entries whose primary reading/kanji form is a single character
        // that appears in the kanji table at the matching JLPT level.
        const kanjiEntries = db
          .prepare(
            `SELECT e.id FROM entries e
             JOIN kanji k ON json_extract(e.kanji_forms, '$[0]') = k.character
             WHERE k.jlpt_level = ?
             LIMIT 5000`
          )
          .all(def.jlpt_level) as Array<{ id: number }>;

        for (const entry of kanjiEntries) {
          insertListItem.run({
            list_id: listId,
            entry_id: entry.id,
            added_at: now,
          });
        }
        console.log(
          `[Phase 5] ${def.name}: ${kanjiEntries.length} kanji entries added.`
        );
      }
    }
  });

  seedAll();
  console.timeEnd("Phase 5");
}

// ---------------------------------------------------------------------------
// Phase 6: Build FTS5 index
// ---------------------------------------------------------------------------

function buildFtsIndex(db: Database.Database): void {
  console.log("[Phase 6] Building FTS5 index…");
  console.time("Phase 6");

  // Populate entries_fts by extracting flattened text from entries
  db.exec(`
    INSERT INTO entries_fts (entry_id, kanji_text, reading_text, meaning_text)
    SELECT
      e.id,
      COALESCE((
        SELECT group_concat(value, ' ')
        FROM json_each(e.kanji_forms)
      ), ''),
      COALESCE((
        SELECT group_concat(value, ' ')
        FROM json_each(e.reading_forms)
      ), ''),
      COALESCE((
        SELECT group_concat(g.value, ' ')
        FROM json_each(e.senses) AS s,
             json_each(json_extract(s.value, '$.glosses')) AS g
      ), '')
    FROM entries e
  `);

  const count = (
    db.prepare(`SELECT COUNT(*) as c FROM entries_fts`).get() as { c: number }
  ).c;
  console.log(`[Phase 6] FTS5 index built for ${count} entries.`);
  console.timeEnd("Phase 6");
}

// ---------------------------------------------------------------------------
// Database schema creation
// ---------------------------------------------------------------------------

function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY,
      kanji_forms TEXT,
      reading_forms TEXT,
      senses TEXT,
      jlpt_level INTEGER,
      is_common INTEGER,
      conjugation_class TEXT,
      tags TEXT
    );

    CREATE TABLE IF NOT EXISTS kanji (
      character TEXT PRIMARY KEY,
      meanings TEXT,
      on_readings TEXT,
      kun_readings TEXT,
      jlpt_level INTEGER,
      grade INTEGER,
      stroke_count INTEGER,
      radicals TEXT,
      frequency INTEGER
    );

    CREATE TABLE IF NOT EXISTS examples (
      id INTEGER PRIMARY KEY,
      japanese TEXT NOT NULL,
      english TEXT NOT NULL,
      tokens TEXT
    );

    CREATE TABLE IF NOT EXISTS entry_examples (
      entry_id INTEGER REFERENCES entries(id),
      example_id INTEGER REFERENCES examples(id),
      PRIMARY KEY (entry_id, example_id)
    );

    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      jlpt_level INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS list_items (
      list_id INTEGER REFERENCES lists(id),
      entry_id INTEGER REFERENCES entries(id),
      added_at TEXT NOT NULL,
      PRIMARY KEY (list_id, entry_id)
    );

    CREATE TABLE IF NOT EXISTS srs_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER REFERENCES entries(id),
      list_id INTEGER REFERENCES lists(id),
      due TEXT,
      stability REAL DEFAULT 0,
      difficulty REAL DEFAULT 0,
      elapsed_days INTEGER DEFAULT 0,
      scheduled_days INTEGER DEFAULT 0,
      reps INTEGER DEFAULT 0,
      lapses INTEGER DEFAULT 0,
      state INTEGER DEFAULT 0,
      last_review TEXT
    );

    CREATE TABLE IF NOT EXISTS search_history (
      entry_id INTEGER REFERENCES entries(id),
      searched_at TEXT NOT NULL,
      search_count INTEGER DEFAULT 1,
      PRIMARY KEY (entry_id)
    );

    CREATE TABLE IF NOT EXISTS study_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      cards_reviewed INTEGER DEFAULT 0,
      cards_correct INTEGER DEFAULT 0,
      cards_again INTEGER DEFAULT 0,
      cards_hard INTEGER DEFAULT 0,
      cards_easy INTEGER DEFAULT 0,
      session_count INTEGER DEFAULT 0,
      streak_length INTEGER DEFAULT 0
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
      entry_id UNINDEXED,
      kanji_text,
      reading_text,
      meaning_text
    );
  `);
}

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

function createIndexes(db: Database.Database): void {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_entries_jlpt ON entries(jlpt_level);
    CREATE INDEX IF NOT EXISTS idx_entries_common ON entries(is_common);
    CREATE INDEX IF NOT EXISTS idx_kanji_jlpt ON kanji(jlpt_level);
    CREATE INDEX IF NOT EXISTS idx_kanji_grade ON kanji(grade);
    CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items(list_id);
    CREATE INDEX IF NOT EXISTS idx_list_items_entry ON list_items(entry_id);
    CREATE INDEX IF NOT EXISTS idx_srs_cards_due ON srs_cards(due);
    CREATE INDEX IF NOT EXISTS idx_srs_cards_entry ON srs_cards(entry_id);
    CREATE INDEX IF NOT EXISTS idx_entry_examples_entry ON entry_examples(entry_id);
  `);
}

// ---------------------------------------------------------------------------
// Phase 7: Finalise
// ---------------------------------------------------------------------------

function finalise(db: Database.Database): void {
  console.log("[Phase 7] Finalising database…");
  console.time("Phase 7");

  db.exec("VACUUM");
  db.exec("ANALYZE");

  const entryCount = (
    db.prepare("SELECT COUNT(*) as c FROM entries").get() as { c: number }
  ).c;
  const kanjiCount = (
    db.prepare("SELECT COUNT(*) as c FROM kanji").get() as { c: number }
  ).c;
  const exampleCount = (
    db.prepare("SELECT COUNT(*) as c FROM examples").get() as { c: number }
  ).c;
  const listCount = (
    db.prepare("SELECT COUNT(*) as c FROM lists").get() as { c: number }
  ).c;
  const listItemCount = (
    db.prepare("SELECT COUNT(*) as c FROM list_items").get() as { c: number }
  ).c;

  const stat = fs.statSync(OUTPUT_PATH);
  const sizeMb = (stat.size / 1024 / 1024).toFixed(1);

  console.timeEnd("Phase 7");

  console.log("");
  console.log("=".repeat(50));
  console.log("  Hoshino DB Build Complete");
  console.log("=".repeat(50));
  console.log(`  Entries:       ${entryCount.toLocaleString()}`);
  console.log(`  Kanji:         ${kanjiCount.toLocaleString()}`);
  console.log(`  Examples:      ${exampleCount.toLocaleString()}`);
  console.log(`  Lists:         ${listCount}`);
  console.log(`  List items:    ${listItemCount.toLocaleString()}`);
  console.log(`  Output:        ${OUTPUT_PATH}`);
  console.log(`  Size:          ${sizeMb} MB`);
  console.log("=".repeat(50));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("Hoshino Dictionary Build Pipeline");
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log("");

  // Ensure assets directory exists
  const assetsDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Remove existing DB to start fresh
  if (fs.existsSync(OUTPUT_PATH)) {
    fs.unlinkSync(OUTPUT_PATH);
    console.log("Removed existing database.");
  }

  const db = new Database(OUTPUT_PATH);

  // Performance pragmas
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = -64000"); // 64MB cache
  db.pragma("temp_store = MEMORY");

  console.log("[Setup] Creating schema…");
  createSchema(db);
  createIndexes(db);
  console.log("[Setup] Schema ready.");
  console.log("");

  // Run all phases
  parseJMdict(db);
  console.log("");

  parseKanjidic(db);
  console.log("");

  await parseTatoeba(db);
  console.log("");

  applyJlptLevels(db);
  console.log("");

  seedJlptLists(db);
  console.log("");

  buildFtsIndex(db);
  console.log("");

  finalise(db);

  db.close();
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
