import { ScrollView, Pressable, Text, View } from "react-native";
import { Check, Plus } from "lucide-react-native";
import BottomDrawer from "./BottomDrawer";
import { useTheme } from "@/hooks/useTheme";
import type { ListSummary } from "@/types/lists";

interface AddToListDrawerProps {
  visible: boolean;
  lists: ListSummary[];
  /** Lists that already hold this word, shown ticked. */
  containing: number[];
  onClose: () => void;
  onPick: (list: ListSummary) => void;
  onCreateNew: () => void;
}

/**
 * Picks a list for a word. Ordered most recently added-to first, so the list
 * you are working through is the one at the top.
 */
export default function AddToListDrawer({
  visible,
  lists,
  containing,
  onClose,
  onPick,
  onCreateNew,
}: AddToListDrawerProps) {
  const { isDark } = useTheme();
  const divider = isDark ? "border-zinc-800" : "border-zinc-100";

  return (
    <BottomDrawer visible={visible} title="Add to list" onClose={onClose}>
      <Pressable
        onPress={onCreateNew}
        className={`flex-row items-center gap-3 py-3 border-b ${divider}`}
      >
        <View className="w-8 h-8 rounded-full bg-accent/10 items-center justify-center">
          <Plus size={16} color={isDark ? "#6366F1" : "#4F46E5"} />
        </View>
        <Text className="text-subheadline font-medium text-accent dark:text-accent-light">
          New list
        </Text>
      </Pressable>

      {lists.length === 0 ? (
        <Text
          className={`text-footnote py-4 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
        >
          You have no lists yet. Create one to start collecting words.
        </Text>
      ) : (
        <ScrollView className="max-h-72" showsVerticalScrollIndicator={false}>
          {lists.map((list) => {
            const has = containing.includes(list.id);
            return (
              <Pressable
                key={list.id}
                onPress={() => onPick(list)}
                className={`flex-row items-center justify-between py-3 border-b ${divider}`}
              >
                <View className="flex-1 mr-3">
                  <Text
                    className={`text-subheadline ${isDark ? "text-zinc-100" : "text-zinc-900"}`}
                    numberOfLines={1}
                  >
                    {list.name}
                  </Text>
                  <Text
                    className={`text-caption1 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
                  >
                    {list.itemCount} {list.itemCount === 1 ? "word" : "words"}
                  </Text>
                </View>
                {has && <Check size={18} color="#22C55E" />}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </BottomDrawer>
  );
}
