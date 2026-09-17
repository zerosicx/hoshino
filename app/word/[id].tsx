import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Plus } from "lucide-react-native";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTheme } from "@/hooks/useTheme";
import { useSearchStore } from "@/stores/searchStore";
import { getEntry, getExamples } from "@/services/dictionary";
import WordDetail from "@/components/WordDetail";
import AddToListDrawer from "@/components/AddToListDrawer";
import { useAddToList } from "@/hooks/useLists";
import { getCustomLists, getListIdsContaining } from "@/services/lists";
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

  // Tapping a list the word is already in takes it out again, so the same row
  // both adds and undoes, there is nowhere else to remove a word from a list.
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

  return (
    <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"}`}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {header}
        <WordDetail
          entry={entry}
          examples={examples}
          readingMode={readingMode}
          onPressKanji={(char) => router.push(`/kanji/${char}`)}
        />
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
