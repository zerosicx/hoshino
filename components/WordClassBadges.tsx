import { View, Text } from "react-native";
import type { WordClassInfo } from "@/utils/wordClass";

interface WordClassBadgesProps {
  info: WordClassInfo | null;
}

/**
 * "Godan" and "u-verb" name the same thing in different textbooks, so they sit
 * in one badge rather than two that look like separate facts.
 */
export default function WordClassBadges({ info }: WordClassBadgesProps) {
  if (!info) return null;

  const type = info.group ? `${info.label} · ${info.group}` : info.label;

  return (
    <>
      <View className="bg-accent/10 px-2 py-0.5 rounded-full">
        <Text className="text-caption2 font-semibold text-accent dark:text-accent-light">
          {type}
        </Text>
      </View>

      {info.transitivity && (
        <View className="bg-zinc-500/10 px-2 py-0.5 rounded-full">
          <Text className="text-caption2 font-semibold text-zinc-600 dark:text-zinc-300">
            {info.transitivity === "transitive" ? "Transitive" : "Intransitive"}
          </Text>
        </View>
      )}
    </>
  );
}
