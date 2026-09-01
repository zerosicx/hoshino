import { getUserDb } from "./database";
import { getEntriesByIds, getJlptEntries, getJlptKanji } from "./dictionary";
import {
  ADD_ITEM_SQL,
  CREATE_LIST_SQL,
  LIST_BY_ID_SQL,
  LIST_ITEM_IDS_SQL,
  LISTS_CONTAINING_SQL,
  MOST_RECENT_LIST_SQL,
  REMOVE_ITEM_SQL,
  SET_STARRED_SQL,
  customListsSql,
  jlptListsSql,
  visibleListsSql,
} from "./listQuery";
import type { ListSummary, ListType } from "@/types/lists";
import type { SearchResult } from "@/types/dictionary";

interface ListRow {
  id: number;
  name: string;
  type: string;
  jlpt_level: number | null;
  starred: number;
  created_at: string;
  item_count: number;
  last_activity: string;
}

function toSummary(row: ListRow): ListSummary {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ListType,
    jlptLevel: row.jlpt_level,
    starred: row.starred === 1,
    itemCount: row.item_count,
    lastActivity: row.last_activity,
  };
}

/** Lists for the main screen: starred first, then Searched Terms, then recent. */
export async function getVisibleLists(): Promise<ListSummary[]> {
  const rows = await getUserDb().getAllAsync<ListRow>(visibleListsSql());
  return rows.map(toSummary);
}

/** The ten preloaded JLPT lists, for the nested section. */
export async function getJlptLists(): Promise<ListSummary[]> {
  const rows = await getUserDb().getAllAsync<ListRow>(jlptListsSql());
  return rows.map(toSummary);
}

/** Lists a word can be added to, most recently added-to first. */
export async function getCustomLists(): Promise<ListSummary[]> {
  const rows = await getUserDb().getAllAsync<ListRow>(customListsSql());
  return rows.map(toSummary);
}

export async function getList(id: number): Promise<ListSummary | null> {
  const row = await getUserDb().getFirstAsync<ListRow>(LIST_BY_ID_SQL, [id]);
  return row ? toSummary(row) : null;
}

/**
 * The list a swipe adds to.
 *
 * Null when the user has not made one yet, which the caller turns into the
 * list-creation drawer rather than an error.
 */
export async function getMostRecentList(): Promise<ListSummary | null> {
  const row = await getUserDb().getFirstAsync<ListRow>(MOST_RECENT_LIST_SQL);
  return row ? toSummary(row) : null;
}

export async function createList(name: string): Promise<ListSummary> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("A list needs a name");

  const result = await getUserDb().runAsync(CREATE_LIST_SQL, [
    trimmed,
    new Date().toISOString(),
  ]);

  const created = await getList(result.lastInsertRowId);
  if (!created) throw new Error("The list could not be read back after saving");
  return created;
}

export async function setStarred(id: number, starred: boolean): Promise<void> {
  await getUserDb().runAsync(SET_STARRED_SQL, [starred ? 1 : 0, id]);
}

export async function addToList(
  listId: number,
  entryId: number
): Promise<void> {
  await getUserDb().runAsync(ADD_ITEM_SQL, [
    listId,
    entryId,
    new Date().toISOString(),
  ]);
}

export async function removeFromList(
  listId: number,
  entryId: number
): Promise<void> {
  await getUserDb().runAsync(REMOVE_ITEM_SQL, [listId, entryId]);
}

/** Which lists already hold this word, so the detail screen can show state. */
export async function getListIdsContaining(
  entryId: number
): Promise<number[]> {
  const rows = await getUserDb().getAllAsync<{ list_id: number }>(
    LISTS_CONTAINING_SQL,
    [entryId]
  );
  return rows.map((r) => r.list_id);
}

/**
 * The words in a list.
 *
 * A JLPT vocabulary list has no rows in `list_items` — it is defined by
 * `jlpt_level` in the dictionary — so it is read from there instead.
 */
export async function getListEntries(
  list: ListSummary
): Promise<SearchResult[]> {
  if (list.type === "jlpt_vocab" && list.jlptLevel !== null) {
    return getJlptEntries(list.jlptLevel);
  }

  const rows = await getUserDb().getAllAsync<{ entry_id: number }>(
    LIST_ITEM_IDS_SQL,
    [list.id]
  );
  return getEntriesByIds(rows.map((r) => r.entry_id));
}

/** The kanji in a JLPT kanji list. */
export async function getListKanji(list: ListSummary) {
  if (list.type !== "jlpt_kanji" || list.jlptLevel === null) return [];
  return getJlptKanji(list.jlptLevel);
}
