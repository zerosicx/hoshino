import { Pressable, Text, View } from "react-native";
import { Rating, GRADES, type Grade } from "@/services/scheduler";

interface SRSRatingBarProps {
  /** The next interval per grade, shown under each label. */
  intervals: Record<Grade, string> | null;
  onRate: (grade: Grade) => void;
}

/** Semantic colours from DESIGN_SYSTEM.md §2.6, as light / dark class pairs. */
const STYLE: Record<Grade, { label: string; text: string; border: string; bg: string }> = {
  [Rating.Again]: {
    label: "Again",
    text: "text-[#B91C1C] dark:text-[#F87171]",
    border: "border-[#B91C1C]/20 dark:border-[#F87171]/25",
    bg: "dark:bg-[#B91C1C]/10",
  },
  [Rating.Hard]: {
    label: "Hard",
    text: "text-[#B45309] dark:text-[#FBBF24]",
    border: "border-[#B45309]/20 dark:border-[#FBBF24]/25",
    bg: "dark:bg-[#B45309]/10",
  },
  [Rating.Good]: {
    label: "Good",
    text: "text-[#15803D] dark:text-[#5CC98E]",
    border: "border-[#15803D]/20 dark:border-[#5CC98E]/25",
    bg: "dark:bg-[#15803D]/10",
  },
  [Rating.Easy]: {
    label: "Easy",
    text: "text-[#1D4ED8] dark:text-[#60A5FA]",
    border: "border-[#1D4ED8]/20 dark:border-[#60A5FA]/25",
    bg: "dark:bg-[#1D4ED8]/10",
  },
};

/**
 * Again / Hard / Good / Easy, each with what it would do. Four equal buttons,
 * 48px tall so the hit area clears the HIG minimum.
 */
export default function SRSRatingBar({ intervals, onRate }: SRSRatingBarProps) {
  return (
    <View className="flex-row gap-2">
      {GRADES.map((grade) => {
        const s = STYLE[grade];
        return (
          <Pressable
            key={grade}
            onPress={() => onRate(grade)}
            accessibilityRole="button"
            accessibilityLabel={s.label}
            className={`flex-1 min-h-[56px] items-center justify-center rounded-md border ${s.border} ${s.bg} active:opacity-70`}
          >
            <Text className={`text-subheadline font-semibold ${s.text}`}>{s.label}</Text>
            {intervals && (
              <Text className={`text-caption1 mt-0.5 ${s.text} opacity-80`}>
                {intervals[grade]}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
