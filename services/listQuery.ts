/**
 * SQL and row mapping for the Lists tab.
 *
 * Kept free of any database import so the queries can be run against a plain
 * SQLite file in tests. `services/lists.ts` executes them.
 */

import type { JlptCounts, ListSummary, ListType } from "@/types/lists";

export interface ListRow {
  id: number;
  name: string;
  type: string;
  jlpt_level: number | null;
  starred: number;
  created_at: string;
  item_count: number;
  last_activity: string;
}

/**
 * A JLPT list has no rows in `list_items` — it is defined by the dictionary's
 * own `jlpt_level` — so its count has to come from the dictionary too.
 */
export function toSummary(row: ListRow, jlpt: JlptCounts): ListSummary {
  const level = row.jlpt_level;
  let itemCount = row.item_count;
  if (level !== null && row.type === "jlpt_vocab") itemCount = jlpt.vocab[level] ?? 0;
  if (level !== null && row.type === "jlpt_kanji") itemCount = jlpt.kanji[level] ?? 0;

  return {
    id: row.id,
    name: row.name,
    type: row.type as ListType,
    jlptLevel: level,
    starred: row.starred === 1,
    itemCount,
    lastActivity: row.last_activity,
  };
}

/**
 * When a list was last touched.
 *
 * Adding a word is the only thing that counts as an edit, so this reads the
 * newest item and falls back to the creation date for a list with none. Derived
 * rather than stored, which means it cannot fall out of step with the items.
 */
const LAST_ACTIVITY = `
  COALESCE(
    (SELECT MAX(added_at) FROM list_items WHERE list_items.list_id = lists.id),
    lists.created_at
  )
`;

const ITEM_COUNT = `
  (SELECT COUNT(*) FROM list_items WHERE list_items.list_id = lists.id)
`;

const COLUMNS = `
  lists.id,
  lists.name,
  lists.type,
  lists.jlpt_level,
  lists.starred,
  lists.created_at,
  ${ITEM_COUNT} AS item_count,
  ${LAST_ACTIVITY} AS last_activity
`;

/**
 * The main Lists screen.
 *
 * Starred lists sit at the top whatever the sort, then Searched Terms, then
 * everything else by how recently it was added to. JLPT lists stay in their own
 * section until starred, which is what brings them into this list.
 */
export function visibleListsSql(): string {
  return `
    SELECT ${COLUMNS}
    FROM lists
    WHERE lists.type IN ('custom', 'system') OR lists.starred = 1
    ORDER BY
      lists.starred DESC,
      (lists.type = 'system') DESC,
      last_activity DESC,
      lists.id DESC
  `;
}

/** The nested JLPT screen: all ten, easiest first, vocabulary before kanji. */
export function jlptListsSql(): string {
  return `
    SELECT ${COLUMNS}
    FROM lists
    WHERE lists.type IN ('jlpt_vocab', 'jlpt_kanji')
    ORDER BY
      lists.jlpt_level DESC,
      (lists.type = 'jlpt_kanji') ASC
  `;
}

/** The one system list, Searched Terms. */
export const SYSTEM_LIST_SQL = `
  SELECT ${COLUMNS}
  FROM lists
  WHERE lists.type = 'system'
  ORDER BY lists.id ASC
  LIMIT 1
`;

export const LIST_BY_ID_SQL = `
  SELECT ${COLUMNS}
  FROM lists
  WHERE lists.id = ?
`;

/**
 * The lists a word can be added to, most recently added-to first.
 *
 * Only lists the user made are candidates: Searched Terms fills itself, and a
 * JLPT list is a fixed syllabus rather than somewhere to collect words.
 */
export function customListsSql(limit?: number): string {
  return `
    SELECT ${COLUMNS}
    FROM lists
    WHERE lists.type = 'custom'
    ORDER BY last_activity DESC, lists.id DESC
    ${limit ? `LIMIT ${limit}` : ""}
  `;
}

/** Where a swipe adds to. */
export const MOST_RECENT_LIST_SQL = customListsSql(1);

export const LIST_ITEM_IDS_SQL = `
  SELECT entry_id
  FROM list_items
  WHERE list_id = ?
  ORDER BY added_at DESC, entry_id DESC
`;

/**
 * A JLPT list is a reference, not somewhere progress can live. Studying one
 * copies it into a list of the user's own — `type = 'custom'` so it can be
 * added to, starred and deleted like any other, with `jlpt_level` kept as
 * provenance so the reference knows it has been started.
 */
export const JLPT_COPY_SQL = `
  SELECT ${COLUMNS}
  FROM lists
  WHERE lists.type = 'custom' AND lists.jlpt_level = ?
  ORDER BY lists.id ASC
  LIMIT 1
`;

export const CREATE_JLPT_COPY_SQL = `
  INSERT INTO lists (name, type, jlpt_level, created_at)
  VALUES (?, 'custom', ?, ?)
`;

export const CREATE_LIST_SQL = `
  INSERT INTO lists (name, type, jlpt_level, created_at)
  VALUES (?, 'custom', NULL, ?)
`;

export const ADD_ITEM_SQL = `
  INSERT OR REPLACE INTO list_items (list_id, entry_id, added_at)
  VALUES (?, ?, ?)
`;

export const REMOVE_ITEM_SQL = `
  DELETE FROM list_items WHERE list_id = ? AND entry_id = ?
`;

/**
 * A hard delete, run as one transaction with the same list id for each. Study
 * cards and items have no foreign key to the list, so they go explicitly. Only
 * a list the user made can go: the built-ins are the app's, not theirs.
 */
export const DELETE_LIST_SQL = [
  `DELETE FROM srs_cards WHERE list_id = ? AND list_id IN (SELECT id FROM lists WHERE type = 'custom')`,
  `DELETE FROM list_items WHERE list_id = ? AND list_id IN (SELECT id FROM lists WHERE type = 'custom')`,
  `DELETE FROM lists WHERE id = ? AND type = 'custom'`,
];

export const SET_STARRED_SQL = `
  UPDATE lists SET starred = ? WHERE id = ?
`;

/** Which of a word's lists already hold it, for the detail screen. */
export const LISTS_CONTAINING_SQL = `
  SELECT list_id FROM list_items WHERE entry_id = ?
`;
