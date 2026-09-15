import { Pressable, Text, View } from "react-native";
import { Play } from "lucide-react-native";

interface DueTodayBarProps {
  /** Cards ready across every active list. */
  due: number;
  /** How many a pile holds, so the bar never promises more than a session. */
  pile: number;
  onStart: () => void;
}

/**
 * The slim accent bar that starts a combined session (DESIGN_SYSTEM.md §9.7).
 *
 * It shows the pile, not the backlog: a hundred overdue cards read as "20
 * ready", which is the number the user can actually finish. With nothing due
 * the session still runs, filled with words not yet seen, and the action says
 * so.
 */
export default function DueTodayBar({ due, pile, onStart }: DueTodayBarProps) {
  const ready = Math.min(due, pile);
  const message = ready > 0 ? `${ready} ${ready === 1 ? "card" : "cards"} ready` : "Nothing due";
  const action = ready > 0 ? "Start Review" : "Learn New";

  return (
    <Pressable
      onPress={onStart}
      accessibilityRole="button"
      accessibilityLabel="Start review"
      className="h-12 flex-row items-center px-4 rounded-sm bg-accent active:bg-accent-dark"
    >
      {/* The message gives way; the action never wraps or leaves the bar. */}
      <Text className="flex-1 mr-3 text-subheadline font-semibold text-white" numberOfLines={1}>
        {message}
      </Text>
      <View className="flex-row items-center gap-1.5 shrink-0">
        <Text className="text-footnote font-semibold text-white">{action}</Text>
        <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
      </View>
    </Pressable>
  );
}
