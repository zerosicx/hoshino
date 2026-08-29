import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import type { SearchResult } from "@/types/dictionary";
import JlptBadge from "./JlptBadge";

interface DictionaryResultRowProps {
  item: SearchResult;
}

export default function DictionaryResultRow({
  item,
}: DictionaryResultRowProps) {
  const router = useRouter();

  const showKanji = item.kanjiForm !== item.readingForm;

  return (
    <Pressable
      onPress={() => router.push(`/dictionary/${item.id}`)}
      className="flex-row items-center py-3 border-b border-zinc-200 dark:border-zinc-800 active:bg-accent/5"
    >
      <View className="flex-1 mr-3">
        {/* Word heading */}
        <View className="flex-row items-baseline gap-2 mb-0.5">
          <Text className="text-body font-semibold text-zinc-900 dark:text-zinc-50">
            {item.kanjiForm}
          </Text>
          {showKanji && (
            <Text className="text-footnote text-accent dark:text-accent-light">
              {item.readingForm}
            </Text>
          )}
        </View>

        {/* Primary meaning */}
        <Text
          className="text-subheadline text-zinc-500 dark:text-zinc-400"
          numberOfLines={1}
        >
          {item.primaryMeaning}
        </Text>
      </View>

      {/* Badges */}
      <View className="flex-row items-center gap-2">
        {item.isCommon && (
          <View className="bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <Text className="text-caption2 font-semibold text-emerald-600 dark:text-emerald-400">
              Common
            </Text>
          </View>
        )}
        <JlptBadge level={item.jlptLevel} />
        <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-600" />
      </View>
    </Pressable>
  );
}
