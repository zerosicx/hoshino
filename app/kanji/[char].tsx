import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";
import { getKanji } from "@/services/dictionary";
import JlptBadge from "@/components/JlptBadge";
import type { KanjiEntry } from "@/types/dictionary";

export default function KanjiDetailScreen() {
  const { char } = useLocalSearchParams<{ char: string }>();
  const router = useRouter();
  const { isDark } = useTheme();

  const [kanji, setKanji] = useState<KanjiEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!char) return;
    (async () => {
      setLoading(true);
      const data = await getKanji(char);
      setKanji(data);
      setLoading(false);
    })();
  }, [char]);

  // The frame paints on the first frame and the kanji fills in underneath it.
  // A local read is too quick for a spinner to be anything but a flash.
  const header = (
    <View className="px-4 pt-14 pb-2">
      <Pressable
        onPress={() => router.back()}
        className="flex-row items-center mb-4"
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
    </View>
  );

  if (!kanji) {
    return (
      <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"}`}>
        {header}
        {!loading && (
          <View className="flex-1 justify-center items-center pb-20">
            <Text
              className={`text-kanji-xl font-bold ${isDark ? "text-zinc-50" : "text-zinc-900"} mb-4`}
            >
              {char}
            </Text>
            <Text
              className={`text-subheadline ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
            >
              Kanji not found in dictionary
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"}`}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {header}

        {/* Hero kanji */}
        <View className="items-center px-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <Text
            className={`text-[72px] leading-[80px] font-bold ${isDark ? "text-zinc-50" : "text-zinc-900"} mb-3`}
          >
            {kanji.character}
          </Text>

          {/* Badges */}
          <View className="flex-row items-center gap-2">
            <JlptBadge level={kanji.jlptLevel} />
            {kanji.grade && (
              <View
                className={`px-2 py-0.5 rounded-full ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`}
              >
                <Text
                  className={`text-caption2 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                >
                  Grade {kanji.grade}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Meanings */}
        {kanji.meanings.length > 0 && (
          <View className="px-4 py-5 border-b border-zinc-200 dark:border-zinc-800">
            <Text
              className={`text-body font-semibold ${isDark ? "text-zinc-50" : "text-zinc-900"} mb-2`}
            >
              Meanings
            </Text>
            <Text
              className={`text-subheadline ${isDark ? "text-zinc-300" : "text-zinc-600"}`}
            >
              {kanji.meanings.join(", ")}
            </Text>
          </View>
        )}

        {/* On'yomi */}
        {kanji.onReadings.length > 0 && (
          <View className="px-4 py-5 border-b border-zinc-200 dark:border-zinc-800">
            <Text
              className={`text-body font-semibold ${isDark ? "text-zinc-50" : "text-zinc-900"} mb-2`}
            >
              On'yomi
            </Text>
            <Text
              className={`text-subheadline ${isDark ? "text-zinc-300" : "text-zinc-600"}`}
            >
              {kanji.onReadings.join("、")}
            </Text>
          </View>
        )}

        {/* Kun'yomi */}
        {kanji.kunReadings.length > 0 && (
          <View className="px-4 py-5 border-b border-zinc-200 dark:border-zinc-800">
            <Text
              className={`text-body font-semibold ${isDark ? "text-zinc-50" : "text-zinc-900"} mb-2`}
            >
              Kun'yomi
            </Text>
            <Text
              className={`text-subheadline ${isDark ? "text-zinc-300" : "text-zinc-600"}`}
            >
              {kanji.kunReadings.join("、")}
            </Text>
          </View>
        )}

        {/* Metadata grid */}
        <View className="px-4 py-5">
          <Text
            className={`text-body font-semibold ${isDark ? "text-zinc-50" : "text-zinc-900"} mb-3`}
          >
            Details
          </Text>
          <View className="flex-row flex-wrap gap-4">
            <MetadataItem
              label="Strokes"
              value={kanji.strokeCount != null ? String(kanji.strokeCount) : "—"}
              isDark={isDark}
            />
            <MetadataItem
              label="Frequency"
              value={kanji.frequency != null ? `#${kanji.frequency}` : "—"}
              isDark={isDark}
            />
            {kanji.radicals.length > 0 && (
              <MetadataItem
                label="Radicals"
                value={kanji.radicals.join(", ")}
                isDark={isDark}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MetadataItem({
  label,
  value,
  isDark,
}: {
  label: string;
  value: string;
  isDark: boolean;
}) {
  return (
    <View
      className={`px-4 py-3 rounded-md ${isDark ? "bg-zinc-900" : "bg-zinc-50"} min-w-[80px]`}
    >
      <Text
        className={`text-caption1 ${isDark ? "text-zinc-500" : "text-zinc-400"} mb-0.5`}
      >
        {label}
      </Text>
      <Text
        className={`text-subheadline font-semibold ${isDark ? "text-zinc-200" : "text-zinc-700"}`}
      >
        {value}
      </Text>
    </View>
  );
}
