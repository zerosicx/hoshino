import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, ClipboardPaste, X } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@/hooks/useTheme";
import { useParagraph } from "@/hooks/useReader";
import { MAX_READER_CHARS, useReaderStore } from "@/stores/readerStore";
import { useSearchStore } from "@/stores/searchStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import { paragraphsOf } from "@/services/readerQuery";
import ReaderText from "@/components/ReaderText";

/** Shown live before anything is pasted, so the mechanic is seen, not explained. */
export const SAMPLE_TEXT = "昨日、駅の近くで新しい本屋を見つけました。";

export default function ReaderScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const readingMode = useSettingsStore((s) => s.readingMode);
  const text = useReaderStore((s) => s.text);
  const setText = useReaderStore((s) => s.setText);
  const clear = useReaderStore((s) => s.clear);
  const setQuery = useSearchStore((s) => s.setQuery);
  const toast = useToastStore((s) => s.show);

  const [editing, setEditing] = useState(text.length === 0);
  const [draft, setDraft] = useState(text);

  const openWord = (id: number) => router.push(`/word/${id}`);
  // Unknown Japanese goes to search prefilled: a dead tap mid-sentence is
  // the fastest way to lose a reader. dismissTo rather than back, so a reader
  // opened first (a deep link) still lands on search instead of nowhere.
  const searchFor = (unknown: string) => {
    setQuery(unknown);
    router.dismissTo("/dictionary");
  };

  /**
   * Whatever was copied last, in one tap. While editing it fills the field;
   * while reading it replaces the text and reads it straight away.
   */
  const paste = async () => {
    const copied = (await Clipboard.getStringAsync()).trim();
    if (!copied) {
      toast("Nothing to paste yet. Copy some Japanese first.");
      return;
    }
    if (editing) {
      setDraft(copied);
      return;
    }
    if ([...copied].length > MAX_READER_CHARS) {
      toast(`Kept the first ${MAX_READER_CHARS.toLocaleString()} characters.`);
    }
    setText(copied);
  };

  const read = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if ([...trimmed].length > MAX_READER_CHARS) {
      toast(`Kept the first ${MAX_READER_CHARS.toLocaleString()} characters.`);
    }
    setText(trimmed);
    setEditing(false);
  };

  const secondary = isDark ? "text-zinc-500" : "text-zinc-400";
  const paragraphs = editing ? [] : paragraphsOf(text);

  return (
    <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"} pt-14`}>
      <View className="px-4 pb-3 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="flex-row items-center" hitSlop={8}>
          <ChevronLeft size={20} color={isDark ? "#6366F1" : "#4F46E5"} />
          <Text className="text-body text-accent dark:text-accent-light ml-1">Dictionary</Text>
        </Pressable>

        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={paste}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Paste"
            className="w-9 h-9 items-center justify-center rounded-full"
          >
            <ClipboardPaste size={20} color={isDark ? "#6366F1" : "#4F46E5"} />
          </Pressable>
          {editing ? (
            <Pressable
              onPress={read}
              disabled={!draft.trim()}
              accessibilityRole="button"
              accessibilityLabel="Read"
              className={`px-4 py-1.5 rounded-full ${draft.trim() ? "bg-accent active:bg-accent-dark" : isDark ? "bg-zinc-800" : "bg-zinc-200"}`}
            >
              <Text className={`text-footnote font-semibold ${draft.trim() ? "text-white" : secondary}`}>
                Read
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                setDraft(text);
                setEditing(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Edit text"
              hitSlop={8}
            >
              <Text className="text-body text-accent dark:text-accent-light">Edit</Text>
            </Pressable>
          )}
        </View>
      </View>

      {editing ? (
        <View className="flex-1 px-4">
          <View
            className={`flex-row items-start border rounded-lg px-3 py-2 ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-zinc-100 border-zinc-200"}`}
            style={{ minHeight: 140, maxHeight: 320 }}
          >
            <TextInput
              className={`flex-1 text-body ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
              value={draft}
              onChangeText={setDraft}
              multiline
              autoFocus={text.length > 0}
              textAlignVertical="top"
              placeholder="Paste Japanese: a message, an article, a menu"
              placeholderTextColor={isDark ? "#71717A" : "#A1A1AA"}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {draft.length > 0 && (
              <Pressable
                onPress={() => {
                  setDraft("");
                  clear();
                }}
                hitSlop={8}
                accessibilityLabel="Clear text"
                className="mt-1"
              >
                <X size={18} color={isDark ? "#A1A1AA" : "#71717A"} />
              </Pressable>
            )}
          </View>
          <Text className={`text-footnote mt-3 ${secondary}`}>
            Words the dictionary knows get their reading and open on tap. Your text stays here
            until you replace it.
          </Text>

          {text.length === 0 && (
            <View className="mt-8">
              <Text className={`text-caption1 font-semibold mb-3 ${secondary}`}>Try it: tap any word</Text>
              <Paragraph text={SAMPLE_TEXT} readingMode={readingMode} onPressWord={openWord} onPressUnknown={searchFor} />
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={paragraphs}
          keyExtractor={(item, index) => `${index}:${item.slice(0, 20)}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          initialNumToRender={4}
          windowSize={7}
          renderItem={({ item }) => (
            <View className="mb-5">
              <Paragraph text={item} readingMode={readingMode} onPressWord={openWord} onPressUnknown={searchFor} />
            </View>
          )}
        />
      )}
    </View>
  );
}

function Paragraph({
  text,
  readingMode,
  onPressWord,
  onPressUnknown,
}: {
  text: string;
  readingMode: ReturnType<typeof useSettingsStore.getState>["readingMode"];
  onPressWord: (id: number) => void;
  onPressUnknown: (text: string) => void;
}) {
  const tokens = useParagraph(text);
  return (
    <ReaderText
      tokens={tokens}
      plain={text}
      readingMode={readingMode}
      onPressWord={onPressWord}
      onPressUnknown={onPressUnknown}
    />
  );
}
