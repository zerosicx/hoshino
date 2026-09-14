import { getUserDb } from "./database";
import {
  getEntriesByIds,
  getJlptCounts,
  getJlptEntries,
  getJlptKanji,
} from "./dictionary";
import {
  ADD_ITEM_SQL,
  CREATE_LIST_SQL,
  DELETE_LIST_SQL,
  LIST_BY_ID_SQL,
  LIST_ITEM_IDS_SQL,
  LISTS_CONTAINING_SQL,
  MOST_RECENT_LIST_SQL,
  REMOVE_ITEM_SQL,
  SET_STARRED_SQL,
  customListsSql,
  jlptListsSql,
  toSummary,
  visibleListsSql,
} from "./listQuery";
import type { ListRow } from "./listQuery";
import type { JlptCounts, ListSummary } from "@/types/lists";
import type { SearchResult } from "@/types/dictionary";

// The dictionary is read-only, so the counts cannot change while the app runs.
let jlptCounts: Promise<JlptCounts> | undefined;

function loadJlptCounts(): Promise<JlptCounts> {
  jlptCounts ??= getJlptCounts().catch((err) => {
    jlptCounts = undefined;
    throw err;
  });
  return jlptCounts;
}

async function summarise(rows: ListRow[]): Promise<ListSummary[]> {
  const counts = await loadJlptCounts();
  return rows.map((row) => toSummary(row, counts));
}

/** Lists for the main screen: starred first, then Searched Terms, then recent. */
export async function getVisibleLists(): Promise<ListSummary[]> {
  return summarise(await getUserDb().getAllAsync<ListRow>(visibleListsSql()));
}

/** The ten preloaded JLPT lists, for the nested section. */
export async function getJlptLists(): Promise<ListSummary[]> {
  return summarise(await getUserDb().getAllAsync<ListRow>(jlptListsSql()));
}

/** Lists a word can be added to, most recently added-to first. */
export async function getCustomLists(): Promise<ListSummary[]> {
  return summarise(await getUserDb().getAllAsync<ListRow>(customListsSql()));
}

export async function getList(id: number): Promise<ListSummary | null> {
  const row = await getUserDb().getFirstAsync<ListRow>(LIST_BY_ID_SQL, [id]);
  if (!row) return null;
  return (await summarise([row]))[0];
}

/**
 * The list a swipe adds to.
 *
 * Null when the user has not made one yet, which the caller turns into the
 * list-creation drawer rather than an error.
 */
export async function getMostRecentList(): Promise<ListSummary | null> {
  const row = await getUserDb().getFirstAsync<ListRow>(MOST_RECENT_LIST_SQL);
  if (!row) return null;
  return (await summarise([row]))[0];
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

/** Removes a custom list for good, with every word and study card in it. */
export async function deleteList(id: number): Promise<void> {
  await getUserDb().withTransactionAsync(async () => {
    for (const sql of DELETE_LIST_SQL) await getUserDb().runAsync(sql, [id]);
  });
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
