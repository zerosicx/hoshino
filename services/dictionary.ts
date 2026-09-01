import { getDictDb, getUserDb } from "./database";
import {
  buildSearchIntent,
  buildSearchQuery,
  rankEntries,
} from "./searchQuery";
import { parseJsonArray, parseSenses } from "@/utils/entryJson";
import { annotateSentence, buildReadingIndex } from "@/utils/furigana";
import { classifySenses } from "@/utils/wordClass";
import type {
  DictionaryEntry,
  ExampleSentence,
  ExampleToken,
  KanjiEntry,
  SearchResult,
} from "@/types/dictionary";

// Raw row shapes from SQLite (JSON columns are strings)

interface RawEntry {
  id: number;
  kanji_forms: string | null;
  reading_forms: string | null;
  senses: string | null;
  jlpt_level: number | null;
  is_common: number;
  conjugation_class: string | null;
  tags: string | null;
}

interface RawKanji {
  character: string;
  meanings: string | null;
  on_readings: string | null;
  kun_readings: string | null;
  jlpt_level: number | null;
  grade: number | null;
  stroke_count: number | null;
  radicals: string | null;
  frequency: number | null;
}

interface RawExample {
  id: number;
  japanese: string;
  english: string;
  tokens: string | null;
}

interface RawSearchHistory {
  id: number;
  kanji_forms: string | null;
  reading_forms: string | null;
  senses: string | null;
  jlpt_level: number | null;
  is_common: number;
}

// ---------------------------------------------------------------------------
// Parsers — JSON columns → typed objects
// ---------------------------------------------------------------------------

function parseTokens(raw: string | null): ExampleToken[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t: Record<string, unknown>) => ({
      surface: String(t.surface ?? ""),
      reading: String(t.reading ?? ""),
      entryId: typeof t.entry_id === "number" ? t.entry_id : null,
    }));
  } catch {
    return [];
  }
}

function rawToEntry(row: RawEntry): DictionaryEntry {
  const senses = parseSenses(row.senses);
  return {
    id: row.id,
    kanjiForms: parseJsonArray(row.kanji_forms),
    readingForms: parseJsonArray(row.reading_forms),
    senses,
    jlptLevel: row.jlpt_level,
    isCommon: row.is_common === 1,
    conjugationClass: row.conjugation_class,
    tags: parseJsonArray(row.tags),
    wordClass: classifySenses(senses),
  };
}

function rawToSearchResult(row: RawEntry | RawSearchHistory): SearchResult {
  const kanjiForms = parseJsonArray(row.kanji_forms);
  const readingForms = parseJsonArray(row.reading_forms);
  const senses = parseSenses(row.senses);
  const firstSense = senses[0];

  return {
    id: row.id,
    kanjiForm: kanjiForms[0] ?? readingForms[0] ?? "",
    readingForm: readingForms[0] ?? "",
    primaryMeaning: firstSense?.glosses[0] ?? "",
    jlptLevel: row.jlpt_level,
    isCommon: row.is_common === 1,
    pos: firstSense?.pos ?? [],
  };
}

function rawToKanji(row: RawKanji): KanjiEntry {
  return {
    character: row.character,
    meanings: parseJsonArray(row.meanings),
    onReadings: parseJsonArray(row.on_readings),
    kunReadings: parseJsonArray(row.kun_readings),
    jlptLevel: row.jlpt_level,
    grade: row.grade,
    strokeCount: row.stroke_count,
    radicals: parseJsonArray(row.radicals),
    frequency: row.frequency,
  };
}

function rawToExample(row: RawExample): ExampleSentence {
  return {
    id: row.id,
    japanese: row.japanese,
    english: row.english,
    tokens: parseTokens(row.tokens),
    furigana: [],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function searchEntries(
  query: string,
  limit = 50
): Promise<SearchResult[]> {
  const intent = buildSearchIntent(query);
  if (!intent) return [];

  const plan = buildSearchQuery(intent);
  const rows = await getDictDb().getAllAsync<RawEntry>(plan.sql, plan.params);

  return rankEntries(intent, rows, limit).map(rawToSearchResult);
}

export async function getEntry(
  id: number
): Promise<DictionaryEntry | null> {
  const db = getDictDb();
  const row = await db.getFirstAsync<RawEntry>(
    `SELECT * FROM entries WHERE id = ?`,
    [id]
  );
  return row ? rawToEntry(row) : null;
}

export async function getKanji(
  char: string
): Promise<KanjiEntry | null> {
  const db = getDictDb();
  const row = await db.getFirstAsync<RawKanji>(
    `SELECT * FROM kanji WHERE character = ?`,
    [char]
  );
  return row ? rawToKanji(row) : null;
}

export async function getExamples(
  entryId: number,
  limit = 5
): Promise<ExampleSentence[]> {
  const db = getDictDb();
  const rows = await db.getAllAsync<RawExample>(
    `SELECT ex.id, ex.japanese, ex.english, ex.tokens
     FROM entry_examples ee
     JOIN examples ex ON ex.id = ee.example_id
     WHERE ee.entry_id = ?
     LIMIT ?`,
    [entryId, limit]
  );

  const examples = rows.map(rawToExample);

  // Every word used across these sentences, fetched once rather than per token.
  const referenced = new Set<number>([entryId]);
  for (const example of examples) {
    for (const token of example.tokens) {
      if (token.entryId != null) referenced.add(token.entryId);
    }
  }

  const spellings = await getSpellings(db, [...referenced]);
  for (const example of examples) {
    example.furigana = annotateSentence(
      example.japanese,
      buildReadingIndex(
        example.tokens.flatMap((t) =>
          t.entryId != null ? (spellings.get(t.entryId) ?? []) : []
        )
      )
    );
  }

  return examples;
}

/**
 * Written/reading pairs for each entry, used to work out how the kanji in an
 * example sentence are read. A word contributes every spelling it has, since
 * the sentence may use any of them.
 */
async function getSpellings(
  db: ReturnType<typeof getDictDb>,
  ids: number[]
): Promise<Map<number, { written: string; reading: string }[]>> {
  const out = new Map<number, { written: string; reading: string }[]>();
  if (ids.length === 0) return out;

  const placeholders = ids.map(() => "?").join(",");
  const rows = await db.getAllAsync<{
    id: number;
    kanji_forms: string | null;
    reading_forms: string | null;
  }>(
    `SELECT id, kanji_forms, reading_forms FROM entries WHERE id IN (${placeholders})`,
    ids
  );

  for (const row of rows) {
    const readings = parseJsonArray(row.reading_forms);
    if (readings.length === 0) continue;
    out.set(
      row.id,
      parseJsonArray(row.kanji_forms).map((written) => ({
        written,
        reading: readings[0],
      }))
    );
  }
  return out;
}

export async function recordSearch(entryId: number): Promise<void> {
  const db = getUserDb();

  // Upsert search_history
  await db.runAsync(
    `INSERT INTO search_history (entry_id, searched_at, search_count)
     VALUES (?, ?, 1)
     ON CONFLICT(entry_id) DO UPDATE SET
       searched_at = excluded.searched_at,
       search_count = search_count + 1`,
    [entryId, new Date().toISOString()]
  );

  // Add to "Searched Terms" system list if not already present
  const list = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM lists WHERE type = 'system' AND name = 'Searched Terms'`
  );
  if (list) {
    await db.runAsync(
      `INSERT OR IGNORE INTO list_items (list_id, entry_id, added_at) VALUES (?, ?, ?)`,
      [list.id, entryId, new Date().toISOString()]
    );
  }
}

export async function getRecentSearches(
  limit = 20
): Promise<SearchResult[]> {
  const userDb = getUserDb();
  const dictDb = getDictDb();

  // Get recent entry IDs from user DB
  const history = await userDb.getAllAsync<{ entry_id: number }>(
    `SELECT entry_id FROM search_history ORDER BY searched_at DESC LIMIT ?`,
    [limit]
  );

  if (history.length === 0) return [];

  // Fetch entry data from dictionary DB
  const ids = history.map((h) => h.entry_id);
  const placeholders = ids.map(() => "?").join(",");
  const rows = await dictDb.getAllAsync<RawSearchHistory>(
    `SELECT id, kanji_forms, reading_forms, senses, jlpt_level, is_common
     FROM entries WHERE id IN (${placeholders})`,
    ids
  );

  // Preserve the search history order
  const rowMap = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => rowMap.get(id))
    .filter((r): r is RawSearchHistory => r != null)
    .map(rawToSearchResult);
}
