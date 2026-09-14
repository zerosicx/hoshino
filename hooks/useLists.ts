import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  addToList,
  createList,
  deleteList,
  getMostRecentList,
  getVisibleLists,
  removeFromList,
} from "@/services/lists";
import { useToastStore } from "@/stores/toastStore";
import { confirmDestructive } from "@/utils/confirm";
import type { ListSummary } from "@/types/lists";

/**
 * The main Lists screen.
 *
 * Reloads on focus because adding a word from anywhere else changes both the
 * counts and the order.
 */
export function useLists() {
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLists(await getVisibleLists());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { lists, loading, reload };
}

/**
 * Moving a word in or out of a list, with the toast that reports how it went.
 *
 * The message names the word and the list either way, so a failure says which
 * one failed rather than just that something did.
 */
export function useAddToList() {
  const show = useToastStore((s) => s.show);

  const add = useCallback(
    async (entryId: number, word: string, list: ListSummary) => {
      try {
        await addToList(list.id, entryId);
        show(`Added ${word} to ${list.name}`);
        return true;
      } catch {
        show(
          `There was a problem adding ${word} to ${list.name}. Try again.`,
          "error"
        );
        return false;
      }
    },
    [show]
  );

  /** Adds to the most recently used list, for the swipe on a search result. */
  const addToMostRecent = useCallback(
    async (entryId: number, word: string) => {
      const list = await getMostRecentList();
      if (!list) return null;
      await add(entryId, word, list);
      return list;
    },
    [add]
  );

  const remove = useCallback(
    async (entryId: number, word: string, list: ListSummary) => {
      try {
        await removeFromList(list.id, entryId);
        show(`Removed ${word} from ${list.name}`);
        return true;
      } catch {
        show(
          `There was a problem removing ${word} from ${list.name}. Try again.`,
          "error"
        );
        return false;
      }
    },
    [show]
  );

  return { add, addToMostRecent, remove };
}

/**
 * Deletes a list for good once the user has confirmed it by name. Resolves
 * true only when the list is gone, so the caller knows whether to leave it.
 */
export function useDeleteList() {
  const show = useToastStore((s) => s.show);

  return useCallback(
    async (list: ListSummary) => {
      const words = list.itemCount === 1 ? "1 word" : `${list.itemCount} words`;
      const ok = await confirmDestructive({
        title: `Delete ${list.name}?`,
        message: `Its ${words} and their study progress go with it. This cannot be undone.`,
        action: "Delete",
      });
      if (!ok) return false;

      try {
        await deleteList(list.id);
        show(`Deleted ${list.name}`);
        return true;
      } catch {
        show(`There was a problem deleting ${list.name}. Try again.`, "error");
        return false;
      }
    },
    [show]
  );
}

export function useCreateList() {
  const show = useToastStore((s) => s.show);

  return useCallback(
    async (name: string) => {
      try {
        return await createList(name);
      } catch {
        show(`There was a problem creating ${name}. Try again.`, "error");
        return null;
      }
    },
    [show]
  );
}
