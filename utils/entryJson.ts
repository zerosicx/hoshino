/** Parsers for the JSON columns on `entries`. */

import type { Sense } from "@/types/dictionary";

export function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function parseSenses(raw: string | null): Sense[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s: Record<string, unknown>) => ({
      glosses: Array.isArray(s.glosses) ? (s.glosses as string[]) : [],
      pos: Array.isArray(s.pos) ? (s.pos as string[]) : [],
      misc: Array.isArray(s.misc) ? (s.misc as string[]) : [],
      info: Array.isArray(s.info) ? (s.info as string[]) : [],
    }));
  } catch {
    return [];
  }
}
