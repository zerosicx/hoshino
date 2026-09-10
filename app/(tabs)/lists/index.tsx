import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, GraduationCap, Plus } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";
import { useLists } from "@/hooks/useLists";
import { setStarred } from "@/services/lists";
import ListRow from "@/components/ListRow";
import type { ListSummary } from "@/types/lists";

export default function ListsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { lists, loading, reload } = useLists();

  const toggleStar = async (list: ListSummary) => {
    await setStarred(list.id, !list.starred);
    reload();
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"} pt-14`}>
      <View className="flex-row items-center justify-between px-4 mb-4">
        <Text
          className={`text-largeTitle font-bold tracking-tight ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
        >
          Lists
        </Text>
        <Pressable
          onPress={() => router.push("/create-list")}
          hitSlop={8}
          className="w-9 h-9 rounded-full bg-accent items-center justify-center"
        >
          <Plus size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={isDark ? "#6366F1" : "#4F46E5"} />
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => (
            <View
              className={`h-px ${isDark ? "bg-zinc-900" : "bg-zinc-100"} ml-4`}
            />
          )}
          ListHeaderComponent={
            <Pressable
              onPress={() => router.push("/lists/jlpt")}
              className={`flex-row items-center px-4 py-3.5 border-b ${isDark ? "border-zinc-900 active:bg-zinc-900" : "border-zinc-100 active:bg-zinc-50"}`}
            >
              <View className="w-8 h-8 rounded-md bg-accent/10 items-center justify-center mr-3">
                <GraduationCap
                  size={16}
                  color={isDark ? "#6366F1" : "#4F46E5"}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`text-body font-semibold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}
                >
                  JLPT
                </Text>
                <Text
                  className={`text-caption1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                >
                  Vocabulary and kanji, N5 to N1
                </Text>
              </View>
              <ChevronRight size={18} color={isDark ? "#71717A" : "#A1A1AA"} />
            </Pressable>
          }
          ListEmptyComponent={
            <Text
              className={`text-footnote px-4 py-6 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
            >
              No lists yet. Tap + to make one, or star a JLPT list to pin it
              here.
            </Text>
          }
          renderItem={({ item }) => (
            <ListRow
              list={item}
              onPress={() => router.push(`/lists/${item.id}`)}
              onToggleStar={
                item.type === "system" ? undefined : () => toggleStar(item)
              }
            />
          )}
        />
      )}
    </View>
  );
}
