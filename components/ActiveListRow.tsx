import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";
import type { ActiveList, ListProgress } from "@/types/study";

interface ActiveListRowProps {
  item: ActiveList;
  /** Session size: the pill shows what one session will take, never more. */
  pile: number;
  /** Starts a mixed session for this list. */
  onPress: () => void;
  /** Starts a review-only session for this list. */
  onReview: () => void;
}

/** One line of counts up the ladder, leaving out any that are zero. */
export function progressSummary(p: ListProgress): string {
  const parts = [
    p.mastered > 0 && `${p.mastered} mastered`,
    p.known > 0 && `${p.known} known`,
    p.familiar > 0 && `${p.familiar} familiar`,
    p.learning > 0 && `${p.learning} learning`,
    p.newCount > 0 && `${p.newCount} new`,
    p.suspended > 0 && `${p.suspended} marked known`,
  ].filter(Boolean);
  return parts.join(" · ");
}

/**
 * A list with study progress: name, how far along it is, and how many cards
 * are waiting, with a way to review just those. Flat row with a divider, like
 * every other list in the app.
 */
export default function ActiveListRow({ item, pile, onPress, onReview }: ActiveListRowProps) {
  const { isDark } = useTheme();
  const { list, progress } = item;
  const studied = progress.total - progress.suspended || 1;
  const masteredPct = (100 * progress.mastered) / studied;
  const risingPct = (100 * (progress.known + progress.familiar)) / studied;
  const learningPct = (100 * progress.learning) / studied;
  const due = Math.min(progress.due, pile);

  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-3.5 border-b ${isDark ? "border-zinc-800 active:bg-zinc-900" : "border-zinc-200 active:bg-zinc-50"}`}
    >
      <View className="flex-row items-center">
        <View className="flex-1 mr-3">
          <Text
            className={`text-body font-semibold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}
            numberOfLines={1}
          >
            {list.name}
          </Text>
          <Text className={`text-caption1 mt-0.5 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            {progressSummary(progress)}
          </Text>
        </View>

        {due > 0 && (
          <View className="items-end mr-2">
            <View className="bg-accent/10 px-3 py-1 rounded-full">
              <Text className="text-caption1 font-semibold text-accent dark:text-accent-light">
                {due} due
              </Text>
            </View>
            <Pressable
              onPress={onReview}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Review ${list.name}`}
              className="mt-1"
            >
              <Text className="text-caption1 font-semibold text-accent dark:text-accent-light">
                Review
              </Text>
            </Pressable>
          </View>
        )}
        <ChevronRight size={18} color={isDark ? "#71717A" : "#A1A1AA"} />
      </View>

      {/* Mastered fills solid, known and familiar lighter, learning lightest;
          new is the track. */}
      <View className={`h-1 rounded-full mt-3 flex-row overflow-hidden ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`}>
        <View className="bg-accent h-full" style={{ width: `${masteredPct}%` }} />
        <View className="bg-accent/50 h-full" style={{ width: `${risingPct}%` }} />
        <View className="bg-accent/25 h-full" style={{ width: `${learningPct}%` }} />
      </View>
    </Pressable>
  );
}
