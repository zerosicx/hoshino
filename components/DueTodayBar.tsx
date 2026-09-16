import { Pressable, Text, View } from "react-native";
import { Play } from "lucide-react-native";
import type { SessionPreview } from "@/types/study";

interface DueTodayBarProps {
  /** What a mixed session would hold right now, already capped. */
  preview: SessionPreview;
  /** Starts a mixed session. */
  onStart: () => void;
  /** Starts a learn session, past today's budget. */
  onLearnMore: () => void;
  /** Nothing due and nothing left to learn: go find a list. */
  onBrowse: () => void;
}

/** "6 due · 4 new", leaving out a part that is zero. */
export function barMessage(preview: SessionPreview): string {
  const parts = [
    preview.due > 0 && `${preview.due} due`,
    preview.fresh > 0 && `${preview.fresh} new`,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return preview.budgetSpent ? "Done for today" : "Nothing due";
}

/**
 * The slim accent bar that starts a combined session (DESIGN_SYSTEM.md §9.7).
 *
 * It says what the session will contain and nothing more: due cards capped at
 * the session size, new words within today's budget. With the budget spent
 * and nothing due it offers to go on learning; with nothing new left anywhere
 * it points at the Lists tab rather than opening an empty session.
 */
export default function DueTodayBar({ preview, onStart, onLearnMore, onBrowse }: DueTodayBarProps) {
  const message = barMessage(preview);
  const hasCards = preview.due + preview.fresh > 0;
  const action = hasCards ? "Start" : preview.budgetSpent ? "Learn more" : "Browse lists";
  const onPress = hasCards ? onStart : preview.budgetSpent ? onLearnMore : onBrowse;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={action}
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
