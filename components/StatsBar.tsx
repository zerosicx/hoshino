import { Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import type { StudyStats } from "@/types/study";

interface StatsBarProps {
  stats: StudyStats | null;
}

/**
 * Streak, learned today, reviewed today. Three numbers separated by
 * hairlines, no card and no icons (DESIGN_SYSTEM.md §9.6). Nothing here
 * falls when the user is honest: there is no accuracy figure.
 */
export default function StatsBar({ stats }: StatsBarProps) {
  const { isDark } = useTheme();
  const divider = isDark ? "border-zinc-800" : "border-zinc-200";

  const items = [
    { value: String(stats?.streak ?? 0), label: "Day streak", colour: "text-[#F97316]" },
    {
      value: String(stats?.learnedToday ?? 0),
      label: "Learned today",
      colour: "text-[#15803D] dark:text-[#5CC98E]",
    },
    {
      value: String(stats?.reviewedToday ?? 0),
      label: "Reviewed today",
      colour: "text-accent dark:text-accent-light",
    },
  ];

  return (
    <View className={`flex-row border-y ${divider} py-3`}>
      {items.map((item, i) => (
        <View
          key={item.label}
          className={`flex-1 items-center ${i > 0 ? `border-l ${divider}` : ""}`}
        >
          <Text className={`text-title2 font-bold ${item.colour}`}>{item.value}</Text>
          <Text className={`text-caption2 mt-0.5 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
