import { View, Text, Pressable } from "react-native";
import { BookOpen } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";
import type { ReadingMode } from "@/stores/settingsStore";
import type { DictionaryEntry, ExampleSentence } from "@/types/dictionary";
import FuriganaText from "./FuriganaText";
import JlptBadge from "./JlptBadge";
import ConjugationTable from "./ConjugationTable";
import WordClassBadges from "./WordClassBadges";
import ExampleSentences from "./ExampleSentences";

interface WordDetailProps {
  entry: DictionaryEntry;
  examples: ExampleSentence[];
  readingMode: ReadingMode;
  /** A kanji in the breakdown was tapped. Left out, the tiles are inert. */
  onPressKanji?: (char: string) => void;
  /** Off on a flashcard back, where seven groups of forms would bury the card. */
  showConjugations?: boolean;
}

/** The kanji in a written form, in order, once each. */
export function kanjiIn(written: string): string[] {
  const seen = new Set<string>();
  for (const ch of written) {
    if (/[一-鿿]/.test(ch)) seen.add(ch);
  }
  return [...seen];
}

/**
 * Everything the app knows about a word, from the hero down to the kanji it is
 * written with. The word page scrolls it; the back of a flashcard will too.
 * It owns no data loading and no navigation, so both can mount it as is.
 */
export default function WordDetail({
  entry,
  examples,
  readingMode,
  onPressKanji,
  showConjugations = true,
}: WordDetailProps) {
  const { isDark } = useTheme();

  const primaryKanji = entry.kanjiForms[0] ?? entry.readingForms[0] ?? "";
  const primaryReading = entry.readingForms[0] ?? "";
  const kanjiChars = kanjiIn(primaryKanji);

  return (
    <View>
      {/* Hero */}
      <View className="px-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <FuriganaText
          pairs={entry.furigana}
          size="xl"
          readingMode={readingMode}
        />

        {entry.readingForms.length > 1 && (
          <Text
            className={`text-footnote ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-2`}
          >
            {entry.readingForms.join("、")}
          </Text>
        )}

        <View className="flex-row flex-wrap items-center gap-2 mt-3">
          <JlptBadge level={entry.jlptLevel} />
          {entry.isCommon && (
            <View className="bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <Text className="text-caption2 font-semibold text-emerald-600 dark:text-emerald-400">
                Common
              </Text>
            </View>
          )}
          <WordClassBadges info={entry.wordClass} />
        </View>
      </View>

      {/* Meanings */}
      <View className="px-4 py-5">
        <View className="flex-row items-center gap-2 mb-3">
          <BookOpen size={18} color={isDark ? "#A1A1AA" : "#71717A"} />
          <Text
            className={`text-body font-semibold ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
          >
            Meanings
          </Text>
        </View>

        {entry.senses.map((sense, i) => (
          <View key={i} className="mb-3">
            <View className="flex-row">
              <Text
                className={`text-footnote font-medium ${isDark ? "text-zinc-600" : "text-zinc-400"} w-6`}
              >
                {i + 1}.
              </Text>
              <View className="flex-1">
                <Text
                  className={`text-subheadline ${isDark ? "text-zinc-200" : "text-zinc-700"}`}
                >
                  {sense.glosses.join("; ")}
                </Text>
                {sense.pos.length > 0 && (
                  <Text
                    className={`text-caption1 ${isDark ? "text-zinc-500" : "text-zinc-400"} mt-0.5`}
                  >
                    {sense.pos.join(", ")}
                  </Text>
                )}
                {sense.info.length > 0 && (
                  <Text className="text-caption1 text-accent dark:text-accent-light mt-0.5">
                    {sense.info.join("; ")}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>

      <ExampleSentences examples={examples} readingMode={readingMode} />

      {showConjugations && entry.wordClass && (
        <ConjugationTable
          written={primaryKanji}
          reading={primaryReading}
          info={entry.wordClass}
          isDark={isDark}
          readingMode={readingMode}
        />
      )}

      {/* Kanji breakdown */}
      {kanjiChars.length > 0 && (
        <View className="px-4 py-5 border-t border-zinc-200 dark:border-zinc-800">
          <Text
            className={`text-body font-semibold ${isDark ? "text-zinc-50" : "text-zinc-900"} mb-3`}
          >
            Kanji
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {kanjiChars.map((char) => (
              <Pressable
                key={char}
                onPress={onPressKanji && (() => onPressKanji(char))}
                accessibilityRole="button"
                accessibilityLabel={`Kanji ${char}`}
                className={`w-12 h-12 items-center justify-center rounded-md border ${isDark ? "border-zinc-700 bg-zinc-900" : "border-zinc-200 bg-zinc-50"} active:bg-accent/10`}
              >
                <Text
                  className={`text-title2 font-bold ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
                >
                  {char}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
