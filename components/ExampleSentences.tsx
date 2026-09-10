import { Text, View } from "react-native";
import { MessageSquare } from "lucide-react-native";
import type { ExampleSentence } from "@/types/dictionary";
import type { ReadingMode } from "@/stores/settingsStore";
import { useTheme } from "@/hooks/useTheme";
import FuriganaText from "./FuriganaText";

interface ExampleSentencesProps {
  examples: ExampleSentence[];
  readingMode: ReadingMode;
}

/**
 * Divider and gap under every example but the last. NativeWind has no `last:`
 * variant, so the position is decided here rather than in a class.
 */
export function exampleRowClass(index: number, count: number) {
  return index < count - 1
    ? "pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800/50"
    : "";
}

export default function ExampleSentences({
  examples,
  readingMode,
}: ExampleSentencesProps) {
  const { isDark } = useTheme();
  if (examples.length === 0) return null;

  return (
    <View className="px-4 py-5 border-t border-zinc-200 dark:border-zinc-800">
      <View className="flex-row items-center gap-2 mb-3">
        <MessageSquare size={18} color={isDark ? "#A1A1AA" : "#71717A"} />
        <Text className="text-body font-semibold text-zinc-900 dark:text-zinc-50">
          Examples
        </Text>
      </View>

      {examples.map((ex, i) => (
        <View key={ex.id} className={exampleRowClass(i, examples.length)}>
          <View className="mb-1">
            <FuriganaText
              pairs={ex.furigana}
              size="sentence"
              readingMode={readingMode}
            />
          </View>
          <Text className="text-footnote text-zinc-400 dark:text-zinc-500">
            {ex.english}
          </Text>
        </View>
      ))}
    </View>
  );
}
