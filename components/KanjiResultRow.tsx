import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { KanjiEntry } from "@/types/dictionary";
import JlptBadge from "./JlptBadge";

interface KanjiResultRowProps {
  item: KanjiEntry;
  onPress: () => void;
}

/** One kanji per row, in the same rhythm as `DictionaryResultRow`. */
export default function KanjiResultRow({ item, onPress }: KanjiResultRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-3 border-b border-zinc-200 dark:border-zinc-800 active:bg-accent/5"
    >
      <Text className="text-title2 font-bold w-12 text-zinc-900 dark:text-zinc-50">
        {item.character}
      </Text>

      <View className="flex-1 mr-3">
        <Text
          className="text-subheadline text-zinc-900 dark:text-zinc-50"
          numberOfLines={1}
        >
          {item.meanings.join(", ")}
        </Text>
        <View className="flex-row gap-3">
          {item.onReadings.length > 0 && (
            <Text
              className="text-footnote text-accent dark:text-accent-light"
              numberOfLines={1}
            >
              {item.onReadings.join("、")}
            </Text>
          )}
          {item.kunReadings.length > 0 && (
            <Text
              className="text-footnote text-zinc-500 dark:text-zinc-400"
              numberOfLines={1}
            >
              {item.kunReadings.join("、")}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <JlptBadge level={item.jlptLevel} />
        <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-600" />
      </View>
    </Pressable>
  );
}
