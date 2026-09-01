import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";
import { useSettingsStore } from "@/stores/settingsStore";
import { getList, getListEntries, getListKanji } from "@/services/lists";
import DictionaryResultRow from "@/components/DictionaryResultRow";
import type { ListSummary } from "@/types/lists";
import type { KanjiEntry, SearchResult } from "@/types/dictionary";

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const readingMode = useSettingsStore((s) => s.readingMode);

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

  const header = (
    <View className="px-4 pb-3">
      <Pressable
        onPress={() => router.back()}
        className="flex-row items-center mb-4"
        hitSlop={8}
      >
        <ChevronLeft size={20} color={isDark ? "#6366F1" : "#4F46E5"} />
        <Text className="text-body text-accent dark:text-accent-light ml-1">
          Back
        </Text>
      </Pressable>

      <Text
        className={`text-title1 font-bold tracking-tight ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
      >
        {list?.name ?? ""}
      </Text>
      <Text
        className={`text-footnote mt-1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
      >
        {kanji.length || entries.length}{" "}
        {list?.type === "jlpt_kanji" ? "kanji" : "words"}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${isDark ? "bg-zinc-950" : "bg-white"}`}
      >
        <ActivityIndicator color={isDark ? "#6366F1" : "#4F46E5"} />
      </View>
    );
  }

  if (!list) {
    return (
      <View
        className={`flex-1 items-center justify-center ${isDark ? "bg-zinc-950" : "bg-white"}`}
      >
        <Text
          className={`text-body ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
        >
          List not found
        </Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"} pt-14`}>
      {list.type === "jlpt_kanji" ? (
        <FlatList
          data={kanji}
          keyExtractor={(item) => item.character}
          numColumns={5}
          ListHeaderComponent={header}
          columnWrapperStyle={{ paddingHorizontal: 12 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/dictionary/kanji/${item.character}`)}
              className={`flex-1 m-1 aspect-square items-center justify-center rounded-md border ${
                isDark
                  ? "border-zinc-800 bg-zinc-900"
                  : "border-zinc-200 bg-zinc-50"
              }`}
            >
              <Text
                className={`text-title2 font-bold ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
              >
                {item.character}
              </Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <Text
              className={`text-footnote ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
            >
              Nothing here yet. Add words from a search result or a word page.
            </Text>
          }
          renderItem={({ item }) => (
            <DictionaryResultRow item={item} readingMode={readingMode} />
          )}
        />
      )}
    </View>
  );
}
