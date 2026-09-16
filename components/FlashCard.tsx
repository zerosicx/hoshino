import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ArrowRight, MoreHorizontal } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";
import type { Stage } from "@/services/scheduler";
import type { CardFrontMode, ReadingMode } from "@/stores/settingsStore";
import type { CardContent } from "@/types/study";
import FuriganaText from "./FuriganaText";
import WordDetail from "./WordDetail";
import BottomDrawer from "./BottomDrawer";
import MasteryBadge from "./MasteryBadge";

interface FlashCardProps {
  content: CardContent | null;
  revealed: boolean;
  onReveal: () => void;
  /** Where the word is on the mastery ladder; shown in the top-left corner. */
  stage?: Stage | null;
  readingMode: ReadingMode;
  cardFront: CardFrontMode;
  reduceMotion: boolean;
  onSeeMore: () => void;
  onMarkKnown: () => void;
  onPressKanji?: (char: string) => void;
}

const FLIP_MS = 320;

/**
 * The card. Tap the front to turn it over; the back is the word's detail page
 * without its conjugation table, with a link to the full page for the rest.
 *
 * The ⋯ in the corner is the only way to mark a word as already known. It is
 * deliberately not in the rating bar: a rating is a reflex, this is a decision.
 */
export default function FlashCard({
  content,
  revealed,
  onReveal,
  stage = null,
  readingMode,
  cardFront,
  reduceMotion,
  onSeeMore,
  onMarkKnown,
  onPressKanji,
}: FlashCardProps) {
  const { isDark } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const flip = useSharedValue(revealed ? 1 : 0);

  useEffect(() => {
    const target = revealed ? 1 : 0;
    flip.value = reduceMotion ? target : withTiming(target, { duration: FLIP_MS });
  }, [revealed, reduceMotion, flip]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
    backfaceVisibility: "hidden",
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }],
    backfaceVisibility: "hidden",
  }));

  const surface = `rounded-xl border ${
    isDark ? "bg-accent/[0.04] border-zinc-800" : "bg-accent/[0.02] border-zinc-200"
  }`;

  const front = (
    <Pressable
      onPress={onReveal}
      accessibilityRole="button"
      accessibilityLabel="Reveal answer"
      className="flex-1 items-center justify-center px-8"
    >
      {content && <Front content={content} readingMode={readingMode} cardFront={cardFront} />}
      <Text
        className={`absolute bottom-6 text-footnote ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
      >
        Tap to reveal
      </Text>
    </Pressable>
  );

  const back = content && (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingTop: 24, paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <WordDetail
        entry={content.entry}
        examples={content.examples}
        readingMode={readingMode}
        onPressKanji={onPressKanji}
        showConjugations={false}
      />
      <Pressable
        onPress={onSeeMore}
        accessibilityRole="link"
        className="flex-row items-center gap-1 px-4 pt-4"
      >
        <Text className="text-footnote font-semibold text-accent dark:text-accent-light">
          See full entry
        </Text>
        <ArrowRight size={14} color={isDark ? "#6366F1" : "#4F46E5"} />
      </Pressable>
    </ScrollView>
  );

  return (
    <View className="flex-1">
      {reduceMotion ? (
        // No turn to draw, so only the face that is showing exists.
        <View className={`flex-1 ${surface}`}>{revealed ? back : front}</View>
      ) : (
        <>
          <Animated.View style={frontStyle} className={`absolute inset-0 ${surface}`}>
            {front}
          </Animated.View>
          <Animated.View
            style={backStyle}
            pointerEvents={revealed ? "auto" : "none"}
            className={`absolute inset-0 ${surface}`}
          >
            {back}
          </Animated.View>
        </>
      )}

      {/* Over both faces, so it neither flips nor disappears with the turn. */}
      {stage && (
        <View className="absolute top-3 left-3">
          <MasteryBadge stage={stage} />
        </View>
      )}

      <Pressable
        onPress={() => setMenuOpen(true)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Card options"
        className="absolute top-3 right-3 w-8 h-8 items-center justify-center rounded-full"
      >
        <MoreHorizontal size={20} color={isDark ? "#71717A" : "#A1A1AA"} />
      </Pressable>

      <BottomDrawer visible={menuOpen} title="This card" onClose={() => setMenuOpen(false)}>
        <Pressable
          onPress={() => {
            setMenuOpen(false);
            onMarkKnown();
          }}
          className={`py-3.5 border-b ${isDark ? "border-zinc-800 active:bg-zinc-800" : "border-zinc-100 active:bg-zinc-50"}`}
        >
          <Text className={`text-body font-semibold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
            I already know this
          </Text>
          <Text className={`text-caption1 mt-0.5 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            Takes it out of study. Restore it any time from the list's page.
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMenuOpen(false)}
          className="py-3.5 items-center"
        >
          <Text className="text-body text-accent dark:text-accent-light">Cancel</Text>
        </Pressable>
      </BottomDrawer>
    </View>
  );
}

function Front({
  content,
  readingMode,
  cardFront,
}: {
  content: CardContent;
  readingMode: ReadingMode;
  cardFront: CardFrontMode;
}) {
  const { isDark } = useTheme();
  const { entry } = content;

  if (cardFront === "meaning") {
    const glosses = entry.senses[0]?.glosses.slice(0, 3).join("; ") ?? "";
    return (
      <Text
        className={`text-title2 font-semibold text-center ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
      >
        {glosses}
      </Text>
    );
  }

  return <FuriganaText pairs={entry.furigana} size="xl" readingMode={readingMode} />;
}
