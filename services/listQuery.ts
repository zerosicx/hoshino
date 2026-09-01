/**
 * SQL for the Lists tab.
 *
 * Kept free of any database import so the queries can be run against a plain
 * SQLite file in tests. `services/lists.ts` executes them.
 */

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

export const SET_STARRED_SQL = `
  UPDATE lists SET starred = ? WHERE id = ?
`;

/** Which of a word's lists already hold it, for the detail screen. */
export const LISTS_CONTAINING_SQL = `
  SELECT list_id FROM list_items WHERE entry_id = ?
`;
