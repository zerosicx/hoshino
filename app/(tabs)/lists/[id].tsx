import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, GraduationCap, Trash2 } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";
import { useSettingsStore } from "@/stores/settingsStore";
import { getList, getListEntries, getListKanji } from "@/services/lists";
import { useAddToList, useDeleteList, useStartStudying } from "@/hooks/useLists";
import { getSuspendedCount, unsuspendAll } from "@/services/srs";
import DictionaryResultRow from "@/components/DictionaryResultRow";
import KanjiResultRow from "@/components/KanjiResultRow";
import SwipeAction from "@/components/SwipeAction";
import type { ListSummary } from "@/types/lists";
import type { KanjiEntry, SearchResult } from "@/types/dictionary";

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const readingMode = useSettingsStore((s) => s.readingMode);
  const { remove } = useAddToList();
  const deleteList = useDeleteList();
  const startStudying = useStartStudying();

  const [list, setList] = useState<ListSummary | null>(null);
  const [entries, setEntries] = useState<SearchResult[]>([]);
  const [kanji, setKanji] = useState<KanjiEntry[]>([]);
  const [known, setKnown] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const found = await getList(Number(id));
    setList(found);

    if (found) {
      if (found.type === "jlpt_kanji") {
        setKanji(await getListKanji(found));
        setEntries([]);
      } else {
        setEntries(await getListEntries(found));
        setKanji([]);
      }
      setKnown(await getSuspendedCount(found.id));
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // A JLPT list is defined by the dictionary's own jlpt_level rather than by
  // rows anyone can delete, so there is nothing to remove a word from.
  const removable = list?.type === "custom" || list?.type === "system";

  const removeEntry = async (item: SearchResult) => {
    if (!list) return;

    const word = item.kanjiForm || item.readingForm;
    if (!(await remove(item.id, word, list))) return;

    setEntries((current) => current.filter((e) => e.id !== item.id));
  };

  // Only a list the user made can go; Searched Terms and JLPT are the app's.
  const deletable = list?.type === "custom";

  // Kanji cannot be studied yet: cards point at entries, and kanji are not.
  const studyable = !!list && list.type !== "jlpt_kanji" && entries.length > 0;

  const study = async () => {
    if (!list) return;
    const listId = await startStudying(list);
    if (listId !== null) router.push(`/study/session?lists=${listId}`);
  };

  const restoreKnown = async () => {
    if (!list) return;
    await unsuspendAll(list.id);
    setKnown(0);
  };

  const deleteThisList = async () => {
    if (!list) return;
    // The count shown is the one loaded here, not the one the summary carried.
    if (await deleteList({ ...list, itemCount: entries.length })) router.back();
  };

  // The frame paints on the first frame; the title and body fill in as they
  // arrive. A local read is too quick for a spinner to be anything but a flash.
  const header = (
    <View className="px-4 pb-3">
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center"
          hitSlop={8}
        >
          <ChevronLeft size={20} color={isDark ? "#6366F1" : "#4F46E5"} />
          <Text className="text-body text-accent dark:text-accent-light ml-1">
            Back
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-3">
          {studyable && (
            <Pressable
              accessibilityLabel="Study this list"
              onPress={study}
              hitSlop={8}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent active:bg-accent-dark"
            >
              <GraduationCap size={16} color="#FFFFFF" />
              <Text className="text-footnote font-semibold text-white">Study</Text>
            </Pressable>
          )}
          {deletable && (
            <Pressable
              accessibilityLabel="Delete list"
              onPress={deleteThisList}
              hitSlop={8}
            >
              <Trash2 size={20} color={isDark ? "#A1A1AA" : "#71717A"} />
            </Pressable>
          )}
        </View>
      </View>

      {list && (
        <Text
          className={`text-title1 font-bold tracking-tight ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
        >
          {list.name}
        </Text>
      )}
      {list && !loading && (
        <Text
          className={`text-footnote mt-1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
        >
          {kanji.length || entries.length}{" "}
          {list.type === "jlpt_kanji" ? "kanji" : "words"}
        </Text>
      )}
      {known > 0 && (
        <View className="flex-row items-center gap-1 mt-1">
          <Text className={`text-footnote ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            {known} marked as known ·
          </Text>
          <Pressable onPress={restoreKnown} hitSlop={6} accessibilityLabel="Restore known words">
            <Text className="text-footnote text-accent dark:text-accent-light">Restore</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  if (!loading && !list) {
    return (
      <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"} pt-14`}>
        {header}
        <View className="flex-1 items-center justify-center">
          <Text
            className={`text-body ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
          >
            List not found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"} pt-14`}>
      {header}

      {loading || !list ? null : list.type === "jlpt_kanji" ? (
        <FlatList
          data={kanji}
          keyExtractor={(item) => item.character}
          initialNumToRender={15}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <KanjiResultRow
              item={item}
              onPress={() => router.push(`/kanji/${item.character}`)}
            />
          )}
        />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <Text
              className={`text-footnote ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
            >
              Nothing here yet. Add words from a search result or a word page.
            </Text>
          }
          renderItem={({ item }) => {
            const row = (
              <DictionaryResultRow
                item={item}
                readingMode={readingMode}
                onPress={() => router.push(`/word/${item.id}`)}
              />
            );
            return removable ? (
              <SwipeAction
                action="remove"
                onTrigger={() => removeEntry(item)}
              >
                {row}
              </SwipeAction>
            ) : (
              row
            );
          }}
        />
      )}
    </View>
  );
}
