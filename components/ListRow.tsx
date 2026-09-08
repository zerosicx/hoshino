import { Pressable, Text, View } from "react-native";
import { ChevronRight, Star } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";
import type { ListSummary } from "@/types/lists";

interface ListRowProps {
  list: ListSummary;
  onPress: () => void;
  onToggleStar?: () => void;
}

export default function ListRow({ list, onPress, onToggleStar }: ListRowProps) {
  const { isDark } = useTheme();
  const total = list.itemCount;
  const unit = list.type === "jlpt_kanji" ? "kanji" : "words";

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-4 py-3.5 ${isDark ? "active:bg-zinc-900" : "active:bg-zinc-50"}`}
    >
      {/* The width is held even without a star so every row's text lines up. */}
      <View className="w-[18px] mr-3">
        {onToggleStar && (
          <Pressable onPress={onToggleStar} hitSlop={10}>
            <Star
              size={18}
              color={list.starred ? "#F59E0B" : isDark ? "#3F3F46" : "#D4D4D8"}
              fill={list.starred ? "#F59E0B" : "transparent"}
            />
          </Pressable>
        )}
      </View>

      <View className="flex-1 mr-3">
        <Text
          className={`text-body font-semibold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}
          numberOfLines={1}
        >
          {list.name}
        </Text>
        <Text
          className={`text-caption1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
        >
          {total} {total === 1 ? unit.replace(/s$/, "") : unit}
        </Text>
      </View>

      <ChevronRight size={18} color={isDark ? "#71717A" : "#A1A1AA"} />
    </Pressable>
  );
}
