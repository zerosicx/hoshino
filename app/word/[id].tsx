import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, BookOpen, Plus } from "lucide-react-native";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTheme } from "@/hooks/useTheme";
import { useSearchStore } from "@/stores/searchStore";
import { getEntry, getExamples } from "@/services/dictionary";
import FuriganaText from "@/components/FuriganaText";
import JlptBadge from "@/components/JlptBadge";
import ConjugationTable from "@/components/ConjugationTable";
import WordClassBadges from "@/components/WordClassBadges";
import AddToListDrawer from "@/components/AddToListDrawer";
import ExampleSentences from "@/components/ExampleSentences";
import { useAddToList } from "@/hooks/useLists";
import { getCustomLists, getListIdsContaining } from "@/services/lists";
import { alignFurigana } from "@/utils/furigana";
import type { DictionaryEntry, ExampleSentence } from "@/types/dictionary";
import type { ListSummary } from "@/types/lists";

export default function WordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const readingMode = useSettingsStore((s) => s.readingMode);
  const recordSearch = useSearchStore((s) => s.recordSearch);

  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [examples, setExamples] = useState<ExampleSentence[]>([]);
  const [loading, setLoading] = useState(true);

  const { add, remove } = useAddToList();
  const [picking, setPicking] = useState(false);
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [containing, setContaining] = useState<number[]>([]);

  useEffect(() => {
    if (!id) return;
    const entryId = Number(id);

    (async () => {
      setLoading(true);
      const [entryData, exampleData] = await Promise.all([
        getEntry(entryId),
        getExamples(entryId),
      ]);
      setEntry(entryData);
      setExamples(exampleData);
      setLoading(false);

      if (entryData) {
        recordSearch(entryId);
      }
    })();
  }, [id, recordSearch]);

  const openPicker = async () => {
    if (!entry) return;
    const [custom, alreadyIn] = await Promise.all([
      getCustomLists(),
      getListIdsContaining(entry.id),
    ]);
    setLists(custom);
    setContaining(alreadyIn);
    setPicking(true);
  };

  // The frame paints on the first frame and the entry fills in underneath it.
  // A local read is too quick for a spinner to be anything but a flash.
  const header = (
    <View className="px-4 pt-14 pb-2 flex-row items-center justify-between mb-4">
      <Pressable
        onPress={() => router.back()}
        className="flex-row items-center"
        hitSlop={8}
      >
        <ChevronLeft
          size={20}
          color={isDark ? "#6366F1" : "#4F46E5"}
        />
        <Text className="text-body text-accent dark:text-accent-light ml-1">
          Back
        </Text>
      </Pressable>

      <Pressable
        onPress={openPicker}
        hitSlop={8}
        accessibilityLabel="Add to list"
        className="w-9 h-9 rounded-full bg-accent items-center justify-center"
      >
        <Plus size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );

  if (!entry) {
    return (
      <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"}`}>
        {header}
        {!loading && (
          <View className="flex-1 justify-center items-center">
            <Text
              className={`text-body ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
            >
              Entry not found
            </Text>
          </View>
        )}
      </View>
    );
  }

  const primaryKanji = entry.kanjiForms[0] ?? entry.readingForms[0] ?? "";
  const primaryReading = entry.readingForms[0] ?? "";
  const furiganaPairs = alignFurigana(primaryKanji, primaryReading);

  // Tapping a list the word is already in takes it out again, so the same row
  // both adds and undoes — there is nowhere else to remove a word from a list.
  const pickList = async (list: ListSummary) => {
    setPicking(false);

    const held = containing.includes(list.id);
    const ok = held
      ? await remove(entry.id, primaryKanji, list)
      : await add(entry.id, primaryKanji, list);
    if (!ok) return;

    setContaining((ids) =>
      held ? ids.filter((id) => id !== list.id) : [...ids, list.id]
    );
  };

  // Extract kanji characters for the breakdown section
  const kanjiChars = primaryKanji
    .split("")
    .filter((ch) => /[\u4E00-\u9FFF]/.test(ch));

  return (
    <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"}`}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {header}

        {/* Hero */}
        <View className="px-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <FuriganaText
            pairs={furiganaPairs}
            size="xl"
            readingMode={readingMode}
          />

          {/* Alt readings / kanji forms */}
          {entry.readingForms.length > 1 && (
            <Text
              className={`text-footnote ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-2`}
            >
              {entry.readingForms.join("、")}
            </Text>
          )}

          {/* Badges row */}
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

        {/* Senses / Meanings */}
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

        {/* Conjugations */}
        {entry.wordClass && (
          <ConjugationTable
            written={primaryKanji}
            reading={primaryReading}
            info={entry.wordClass}
            isDark={isDark}
            readingMode={readingMode}
          />
        )}

        {/* Kanji Breakdown */}
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
                  onPress={() => router.push(`/kanji/${char}`)}
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

      </ScrollView>

      <AddToListDrawer
        visible={picking}
        lists={lists}
        containing={containing}
        onClose={() => setPicking(false)}
        onPick={pickList}
        onCreateNew={() => {
          setPicking(false);
          router.push({
            pathname: "/create-list",
            params: { entryId: String(entry.id), word: primaryKanji },
          });
        }}
      />
    </View>
  );
}
