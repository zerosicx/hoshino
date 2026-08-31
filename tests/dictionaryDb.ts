import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { SearchQueryPlan } from "@/services/searchQuery";

export const DICT_DB_PATH = path.join(process.cwd(), "assets", "hoshino.db");

export const dictionaryDbExists = fs.existsSync(DICT_DB_PATH);

export interface BenchmarkRow {
  id: number;
  kanji_forms: string | null;
  reading_forms: string | null;
  senses: string | null;
  jlpt_level: number | null;
  is_common: number;
}

let db: Database.Database | null = null;

export function openDictionaryDb(): Database.Database {
  if (!db) db = new Database(DICT_DB_PATH, { readonly: true });
  return db;
}

export function closeDictionaryDb(): void {
  db?.close();
  db = null;
}

export function runPlan(plan: SearchQueryPlan): BenchmarkRow[] {
  return openDictionaryDb()
    .prepare(plan.sql)
    .all(...plan.params) as BenchmarkRow[];
}

function parseArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** Every surface form of a row, used to check a benchmark expectation. */
export function surfaceForms(row: BenchmarkRow): string[] {
  return [...parseArray(row.kanji_forms), ...parseArray(row.reading_forms)];
}

/** Short human-readable label for failure messages. */
export function describeRow(row: BenchmarkRow): string {
  const kanji = parseArray(row.kanji_forms)[0];
  const reading = parseArray(row.reading_forms)[0];
  let gloss = "";
  try {
    const senses: unknown = JSON.parse(row.senses ?? "[]");
    if (Array.isArray(senses) && senses.length > 0) {
      const first = senses[0] as { glosses?: unknown };
      if (Array.isArray(first.glosses)) gloss = String(first.glosses[0] ?? "");
    }
  } catch {
    gloss = "";
  }
  const head = kanji ?? reading ?? String(row.id);
  return `${head}${reading && reading !== head ? ` (${reading})` : ""} — ${gloss}`;
}

/** Rank of the expected surface form in the result list, or -1 if absent. */
export function rankOf(rows: BenchmarkRow[], expected: string): number {
  return rows.findIndex((row) => surfaceForms(row).includes(expected));
}
