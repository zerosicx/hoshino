import { View, Text, Pressable } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { SearchResult } from "@/types/dictionary";
import type { ReadingMode } from "@/stores/settingsStore";
import { kanaToRomaji } from "@/utils/japanese";
import JlptBadge from "./JlptBadge";

interface DictionaryResultRowProps {
  item: SearchResult;
  readingMode?: ReadingMode;
  onPress: () => void;
}

export default function DictionaryResultRow({
  item,
  readingMode = "furigana",
  onPress,
}: DictionaryResultRowProps) {
  const romaji = readingMode === "romaji";
  // The reading is what tells two spellings apart here, so it stays visible
  // under "none" — that setting hides ruby text, not this column.
  const reading = romaji ? kanaToRomaji(item.readingForm) : item.readingForm;

  // A kana word normally repeats itself here, so the column is hidden. In
  // romaji mode it does not repeat: きれい reads "kirei", which is the whole
  // point of the setting for someone who cannot read kana yet.
  const showReading = romaji
    ? Boolean(item.readingForm)
    : item.kanjiForm !== item.readingForm;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-3 border-b border-zinc-200 dark:border-zinc-800 active:bg-accent/5"
    >
      <View className="flex-1 mr-3">
        {/* Word heading */}
        <View className="flex-row items-baseline gap-2 mb-0.5">
          <Text className="text-body font-semibold text-zinc-900 dark:text-zinc-50">
            {item.kanjiForm}
          </Text>
          {showReading && (
            <Text className="text-footnote text-accent dark:text-accent-light">
              {reading}
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
