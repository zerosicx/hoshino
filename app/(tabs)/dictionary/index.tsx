import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, X } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";
import { useDictionary } from "@/hooks/useDictionary";
import { useSettingsStore } from "@/stores/settingsStore";
import DictionaryResultRow from "@/components/DictionaryResultRow";
import SwipeToAdd from "@/components/SwipeToAdd";
import CreateListDrawer from "@/components/CreateListDrawer";
import { useAddToList, useCreateList } from "@/hooks/useLists";
import type { SearchResult } from "@/types/dictionary";

export default function DictionaryScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const readingMode = useSettingsStore((s) => s.readingMode);

  const { add, addToMostRecent } = useAddToList();
  const createList = useCreateList();
  // Held while the drawer is open so the word survives the round trip through
  // list creation, which is what a swipe with no lists yet turns into.
  const [pendingAdd, setPendingAdd] = useState<SearchResult | null>(null);

  const swipeAdd = async (item: SearchResult) => {
    const word = item.kanjiForm || item.readingForm;
    const list = await addToMostRecent(item.id, word);
    if (!list) setPendingAdd(item);
  };

  const createAndAdd = async (name: string) => {
    const item = pendingAdd;
    setPendingAdd(null);
    if (!item) return;

    const created = await createList(name);
    if (created) await add(item.id, item.kanjiForm || item.readingForm, created);
  };

  const {
    query,
    results,
    recentSearches,
    isLoading,
    hasSearched,
    setQuery,
    clearSearch,
  } = useDictionary();

  const showResults = query.trim().length > 0;

  return (
    <View
      className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"} px-4 pt-14`}
    >
      {/* Header */}
      <Text
        className={`text-largeTitle font-bold ${isDark ? "text-zinc-50" : "text-zinc-900"} mb-4 tracking-tight`}
      >
        Dictionary
      </Text>

      {/* Search Input */}
      <View
        className={`flex-row items-center ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-zinc-100 border-zinc-200"} border rounded-lg px-3 h-12 mb-4`}
      >
        <Search size={18} color={isDark ? "#A1A1AA" : "#71717A"} />
        <TextInput
          className={`flex-1 ml-2 text-body ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
          value={query}
          onChangeText={setQuery}
          placeholder="Search kanji, kana, or English..."
          placeholderTextColor={isDark ? "#71717A" : "#A1A1AA"}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={clearSearch} hitSlop={8}>
            <X size={18} color={isDark ? "#A1A1AA" : "#71717A"} />
          </Pressable>
        )}
      </View>

      {showResults ? (
        // Search results
        <>
          {isLoading && (
            <View className="py-8 items-center">
              <ActivityIndicator
                size="small"
                color={isDark ? "#6366F1" : "#4F46E5"}
              />
            </View>
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <View className="flex-1 justify-center items-center pb-20">
              <Text
                className={`text-subheadline ${isDark ? "text-zinc-600" : "text-zinc-400"} text-center`}
              >
                No results for "{query}"
              </Text>
            </View>
          )}

          {!isLoading && results.length > 0 && (
            <FlatList
              data={results}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <SwipeToAdd onAdd={() => swipeAdd(item)}>
                  <DictionaryResultRow item={item} readingMode={readingMode} />
                </SwipeToAdd>
              )}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 100 }}
            />
          )}
        </>
      ) : (
        // Home state — recent searches + empty prompt
        <View className="flex-1">
          {recentSearches.length > 0 && (
            <View className="mb-6">
              <Text
                className={`text-body font-semibold ${isDark ? "text-zinc-50" : "text-zinc-900"} mb-3`}
              >
                Recently Searched
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {recentSearches.slice(0, 10).map((item) => (
                  <RecentSearchChip
                    key={item.id}
                    item={item}
                    isDark={isDark}
                    onPress={() => router.push(`/dictionary/${item.id}`)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <View className="flex-1 justify-center items-center pb-20">
            <Text
              className={`text-subheadline ${isDark ? "text-zinc-600" : "text-zinc-400"} text-center`}
            >
              Search 217,000+ words & kanji
            </Text>
          </View>
        </View>
      )}

      <CreateListDrawer
        visible={pendingAdd !== null}
        onClose={() => setPendingAdd(null)}
        onCreate={createAndAdd}
      />
    </View>
  );
}

function RecentSearchChip({
  item,
  isDark,
  onPress,
}: {
  item: SearchResult;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-2 rounded-md ${isDark ? "bg-zinc-900" : "bg-zinc-100"} active:bg-accent/5`}
    >
      <Text
        className={`text-subheadline font-medium ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
      >
        {item.kanjiForm}
      </Text>
      <Text
        className={`text-caption1 ${isDark ? "text-zinc-500" : "text-zinc-400"} mt-0.5`}
        numberOfLines={1}
      >
        {item.primaryMeaning}
      </Text>
    </Pressable>
  );
}
