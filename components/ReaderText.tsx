import { Pressable, Text, View } from "react-native";
import { rubyText } from "@/utils/furigana";
import type { ReadingMode } from "@/stores/settingsStore";
import type { ReaderToken } from "@/types/reader";

interface ReaderTextProps {
  /** Null while the paragraph is still being looked up: it shows as plain text. */
  tokens: ReaderToken[] | null;
  plain: string;
  readingMode: ReadingMode;
  onPressWord: (entryId: number) => void;
  onPressUnknown: (text: string) => void;
}

/**
 * One paragraph of tappable words with their readings above.
 *
 * Views in a wrapping row rather than nested Text: Android cannot lay out a
 * View inside Text without a fixed size, and nested-Text press targets land
 * in the wrong place. The reading setting is honoured: furigana or romaji
 * above the kanji, or nothing.
 */
export default function ReaderText({
  tokens,
  plain,
  readingMode,
  onPressWord,
  onPressUnknown,
}: ReaderTextProps) {
  const showRuby = readingMode !== "none";
  const romaji = readingMode === "romaji";

  if (!tokens) {
    return (
      <Text className="text-body leading-[30px] text-zinc-900 dark:text-zinc-50">{plain}</Text>
    );
  }

  return (
    <View className="flex-row flex-wrap items-end">
      {tokens.map((token, i) => {
        const reading = token.furigana.map((p) => p.reading).filter(Boolean).join("");
        const body = (
          <View className="flex-row items-end">
            {token.furigana.map((pair, j) => (
              <View key={j} className="items-center">
                {showRuby && (
                  <Text
                    className="text-[10px] leading-[12px] text-accent dark:text-accent-light text-center"
                    style={{ minHeight: 12 }}
                  >
                    {rubyText(pair, romaji) || " "}
                  </Text>
                )}
                <Text
                  className={`text-body text-zinc-900 dark:text-zinc-50 ${
                    token.visited ? "border-b border-accent/50" : ""
                  }`}
                >
                  {pair.base}
                </Text>
              </View>
            ))}
          </View>
        );

        if (token.entryId !== null) {
          const id = token.entryId;
          return (
            <Pressable
              key={i}
              onPress={() => onPressWord(id)}
              accessibilityRole="button"
              accessibilityLabel={reading ? `${token.text}、${reading}` : token.text}
              hitSlop={{ top: 4, bottom: 4 }}
              className="px-[1px] active:bg-accent/10 rounded-sm"
            >
              {body}
            </Pressable>
          );
        }

        if (token.searchable) {
          return (
            <Pressable
              key={i}
              onPress={() => onPressUnknown(token.text)}
              accessibilityRole="button"
              accessibilityLabel={`${token.text}、search`}
              hitSlop={{ top: 4, bottom: 4 }}
              className="px-[1px] active:bg-accent/10 rounded-sm"
            >
              {body}
            </Pressable>
          );
        }

        return (
          <View key={i} className="px-[1px]">
            {body}
          </View>
        );
      })}
    </View>
  );
}
