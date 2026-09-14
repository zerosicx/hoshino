import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Trash2 } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";
import { useSettingsStore } from "@/stores/settingsStore";
import { getList, getListEntries, getListKanji } from "@/services/lists";
import { useAddToList, useDeleteList } from "@/hooks/useLists";
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

  const [list, setList] = useState<ListSummary | null>(null);
  const [entries, setEntries] = useState<SearchResult[]>([]);
  const [kanji, setKanji] = useState<KanjiEntry[]>([]);
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
