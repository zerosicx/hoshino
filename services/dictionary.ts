import { getDictDb, getUserDb } from "./database";
import type {
  DictionaryEntry,
  ExampleSentence,
  ExampleToken,
  KanjiEntry,
  SearchResult,
  Sense,
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

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseSenses(raw: string | null): Sense[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s: Record<string, unknown>) => ({
      glosses: Array.isArray(s.glosses) ? s.glosses : [],
      pos: Array.isArray(s.pos) ? s.pos : [],
      misc: Array.isArray(s.misc) ? s.misc : [],
      info: Array.isArray(s.info) ? s.info : [],
    }));
  } catch {
    return [];
  }
}

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
  return {
    id: row.id,
    kanjiForms: parseJsonArray(row.kanji_forms),
    readingForms: parseJsonArray(row.reading_forms),
    senses: parseSenses(row.senses),
    jlptLevel: row.jlpt_level,
    isCommon: row.is_common === 1,
    conjugationClass: row.conjugation_class,
    tags: parseJsonArray(row.tags),
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
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const JP_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

export async function searchEntries(
  query: string,
  limit = 50
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const db = getDictDb();
  const isJapanese = JP_REGEX.test(trimmed);
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  let ftsQuery: string;
  if (isJapanese) {
    // Japanese input: prefix-match against kanji and reading columns only
    ftsQuery = tokens
      .map((t) => `{kanji_text reading_text} : ${t}*`)
      .join(" ");
  } else {
    // English input: exact token match against meaning column only
    ftsQuery = tokens.map((t) => `meaning_text : ${t}`).join(" ");
  }

  const rows = await db.getAllAsync<RawEntry>(
    `SELECT e.id, e.kanji_forms, e.reading_forms, e.senses, e.jlpt_level, e.is_common
     FROM entries_fts fts
     JOIN entries e ON e.id = fts.rowid
     WHERE entries_fts MATCH ?
     ORDER BY
       rank
       - (e.is_common * 15)
       - (CASE e.jlpt_level
            WHEN 5 THEN 10
            WHEN 4 THEN 8
            WHEN 3 THEN 6
            WHEN 2 THEN 4
            WHEN 1 THEN 2
            ELSE 0
          END)
     LIMIT ?`,
    [ftsQuery, limit]
  );

  return rows.map(rawToSearchResult);
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
  return rows.map(rawToExample);
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
