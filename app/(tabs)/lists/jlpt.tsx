import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";
import { getJlptLists, setStarred } from "@/services/lists";
import { getJlptCounts } from "@/services/dictionary";
import ListRow from "@/components/ListRow";
import type { ListSummary } from "@/types/lists";

type Counts = { vocab: Record<number, number>; kanji: Record<number, number> };

export default function JlptListsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [rows, totals] = await Promise.all([getJlptLists(), getJlptCounts()]);
    setLists(rows);
    setCounts(totals);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const countFor = (list: ListSummary) => {
    if (!counts || list.jlptLevel === null) return 0;
    const table = list.type === "jlpt_kanji" ? counts.kanji : counts.vocab;
    return table[list.jlptLevel] ?? 0;
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"} pt-14`}>
      <View className="px-4 pb-2">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center mb-4"
          hitSlop={8}
        >
          <ChevronLeft size={20} color={isDark ? "#6366F1" : "#4F46E5"} />
          <Text className="text-body text-accent dark:text-accent-light ml-1">
            Lists
          </Text>
        </Pressable>

        <Text
          className={`text-largeTitle font-bold tracking-tight ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
        >
          JLPT
        </Text>
        <Text
          className={`text-footnote mt-1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
        >
          Star a list to pin it to your Lists screen.
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={isDark ? "#6366F1" : "#4F46E5"} />
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          ItemSeparatorComponent={() => (
            <View
              className={`h-px ${isDark ? "bg-zinc-900" : "bg-zinc-100"} ml-4`}
            />
          )}
          renderItem={({ item }) => (
            <ListRow
              list={item}
              count={countFor(item)}
              onPress={() => router.push(`/lists/${item.id}`)}
              onToggleStar={async () => {
                await setStarred(item.id, !item.starred);
                reload();
              }}
            />
          )}
        />
      )}
    </View>
  );
}
