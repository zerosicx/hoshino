import { View, Text } from "react-native";
import { SquarePen } from "lucide-react-native";
import { conjugate, type ConjugatedForm } from "@/utils/conjugation";
import type { WordClassInfo } from "@/utils/wordClass";
import type { ReadingMode } from "@/stores/settingsStore";
import { kanaToRomaji } from "@/utils/japanese";

interface ConjugationTableProps {
  written: string;
  reading: string;
  info: WordClassInfo;
  isDark: boolean;
  readingMode?: ReadingMode;
}

const TRANSITIVITY_HINT: Record<string, string> = {
  transitive: "takes a direct object marked with を",
  intransitive: "does not take a direct object",
};

export default function ConjugationTable({
  written,
  reading,
  info,
  isDark,
  readingMode = "furigana",
}: ConjugationTableProps) {
  const groups = conjugate(written, reading, info.wordClass);
  if (groups.length === 0) return null;

  const summary = [
    info.group ? `${info.label} (${info.group})` : info.label,
    info.transitivity && TRANSITIVITY_HINT[info.transitivity]
      ? `${info.transitivity}: ${TRANSITIVITY_HINT[info.transitivity]}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View className="px-4 py-5 border-t border-zinc-200 dark:border-zinc-800">
      <View className="flex-row items-center gap-2 mb-1">
        <SquarePen size={18} color={isDark ? "#A1A1AA" : "#71717A"} />
        <Text
          className={`text-body font-semibold ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
        >
          Conjugations
        </Text>
      </View>

      <Text
        className={`text-caption1 ${isDark ? "text-zinc-500" : "text-zinc-400"} mb-4`}
      >
        {summary}
      </Text>

      {groups.map((group) => (
        <View key={group.title} className="mb-4">
          <Text
            className={`text-caption1 font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"} mb-2`}
          >
            {group.title}
          </Text>

          <View className="flex-row flex-wrap -mx-1">
            {group.forms.map((form) => (
              <FormCell
                key={`${group.title}-${form.name}`}
                form={form}
                isDark={isDark}
                readingMode={readingMode}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function FormCell({
  form,
  isDark,
  readingMode,
}: {
  form: ConjugatedForm;
  isDark: boolean;
  readingMode: ReadingMode;
}) {
  // A kana form repeats the written word, so it is normally hidden. Its romaji
  // does not repeat it, and is the only readable line for a romaji reader.
  const showReading =
    readingMode === "romaji"
      ? Boolean(form.reading)
      : readingMode !== "none" && form.reading !== form.written;

  return (
    <View className="w-1/2 px-1 mb-2">
      <View
        className={`rounded-sm p-3 ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`}
      >
        <Text
          className={`text-caption2 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
          numberOfLines={1}
        >
          {form.name}
          {form.hint ? ` · ${form.hint}` : ""}
        </Text>

        {/* Reading first so it reads like furigana above the word */}
        {showReading && (
          <Text className="text-caption2 text-accent dark:text-accent-light mt-1">
            {readingMode === "romaji" ? kanaToRomaji(form.reading) : form.reading}
          </Text>
        )}

        <Text
          className={`text-subheadline font-medium ${isDark ? "text-zinc-50" : "text-zinc-900"} mt-0.5`}
        >
          {form.written}
        </Text>
      </View>
    </View>
  );
}
