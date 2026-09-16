import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useStudyStats } from "@/hooks/useStudyStats";
import { useSettingsStore } from "@/stores/settingsStore";
import StatsBar from "@/components/StatsBar";
import DueTodayBar from "@/components/DueTodayBar";
import ActiveListRow from "@/components/ActiveListRow";

export default function StudyScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const sessionSize = useSettingsStore((s) => s.sessionSize);
  const { stats, activeLists, totalDue, loading } = useStudyStats();

  const secondary = isDark ? "text-zinc-500" : "text-zinc-400";

  return (
    <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"} pt-14`}>
      <FlatList
        data={activeLists}
        keyExtractor={(item) => String(item.list.id)}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <Text
              className={`text-largeTitle font-bold tracking-tight px-4 mb-4 ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
            >
              Study
            </Text>

            <StatsBar stats={stats} />

            {activeLists.length > 0 && (
              <View className="px-4 mt-4">
                <DueTodayBar
                  due={totalDue}
                  pile={sessionSize}
                  onStart={() => router.push("/study/session?lists=all")}
                />
                {/* Only when it changes something: with nothing due the bar
                    already says Learn New, and with a full pile of due cards
                    the two sessions are the same. */}
                {totalDue > 0 && totalDue < sessionSize && (
                  <Pressable
                    onPress={() => router.push("/study/session?lists=all&mode=review")}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Review only"
                    className="self-end mt-2"
                  >
                    <Text className="text-footnote text-accent dark:text-accent-light">
                      Review only · {totalDue} {totalDue === 1 ? "card" : "cards"}, no new words
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            <View className="flex-row items-center justify-between px-4 mt-6 mb-1">
              <Text
                className={`text-body font-semibold ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
              >
                Active Lists
              </Text>
              <Pressable onPress={() => router.push("/lists")} hitSlop={8}>
                <Text className="text-footnote text-accent dark:text-accent-light">
                  Browse All
                </Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View className="px-4 py-6">
              <Text className={`text-footnote ${secondary}`}>
                Nothing in study yet. Open a list and tap Study to build your
                first pile — every word you look up is already waiting in
                Searched Terms.
              </Text>
              <Pressable
                onPress={() => router.push("/lists")}
                className="self-start mt-4 px-4 py-2.5 rounded-md bg-accent active:bg-accent-dark"
              >
                <Text className="text-footnote font-semibold text-white">Browse Lists</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ActiveListRow
            item={item}
            pile={sessionSize}
            onPress={() => router.push(`/study/session?lists=${item.list.id}`)}
          />
        )}
      />
    </View>
  );
}
