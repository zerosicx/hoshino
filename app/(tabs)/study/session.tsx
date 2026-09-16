import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { useStudySession, type SessionTally } from "@/hooks/useStudySession";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import { getActiveLists } from "@/services/srs";
import type { SessionMode } from "@/types/study";
import FlashCard from "@/components/FlashCard";
import SRSRatingBar from "@/components/SRSRatingBar";

/** `lists=all` is every active list; otherwise comma-separated list ids. */
function parseListIds(param: string | undefined): number[] | "all" {
  if (!param || param === "all") return "all";
  return param
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
}

function parseMode(param: string | undefined): SessionMode {
  return param === "review" || param === "learn" ? param : "mixed";
}

const MODE_CAPTION: Record<SessionMode, string | null> = {
  mixed: null,
  review: "Review only",
  learn: "Learning more",
};

/**
 * "8 of 10 new words learned · 12 reviews · 2 still learning, back tomorrow",
 * leaving out any part that is zero.
 */
export function sessionSummary(t: SessionTally): string {
  const parts = [
    t.introduced > 0 &&
      `${t.learned} of ${t.introduced} new ${t.introduced === 1 ? "word" : "words"} learned`,
    t.reviews > 0 && `${t.reviews} ${t.reviews === 1 ? "review" : "reviews"}`,
    t.stillLearning > 0 && `${t.stillLearning} still learning, back tomorrow`,
  ].filter(Boolean);
  return parts.join(" · ");
}

export default function StudySessionScreen() {
  const { lists, mode } = useLocalSearchParams<{ lists?: string; mode?: string }>();
  const wanted = parseListIds(lists);
  const [listIds, setListIds] = useState<number[] | null>(
    wanted === "all" ? null : wanted
  );

  useEffect(() => {
    if (wanted !== "all") return;
    let cancelled = false;
    getActiveLists().then((active) => {
      if (!cancelled) setListIds(active.map((a) => a.list.id));
    });
    return () => {
      cancelled = true;
    };
    // `wanted` is re-derived every render; the param string is the real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists]);

  const { isDark } = useTheme();
  if (listIds === null) {
    return <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"}`} />;
  }
  return <Session listIds={listIds} listsParam={lists ?? "all"} mode={parseMode(mode)} />;
}

function Session({ listIds, listsParam, mode }: { listIds: number[]; listsParam: string; mode: SessionMode }) {
  const router = useRouter();
  const { isDark } = useTheme();
  const readingMode = useSettingsStore((s) => s.readingMode);
  const cardFront = useSettingsStore((s) => s.cardFrontMode);
  const sessionSize = useSettingsStore((s) => s.sessionSize);
  const newPerDay = useSettingsStore((s) => s.newPerDay);
  const reduceMotion = useReduceMotion();
  const toast = useToastStore((s) => s.show);

  const session = useStudySession(listIds, { mode, sessionSize, newPerDay });
  const reviewOnly = mode === "review";
  const caption = MODE_CAPTION[mode];
  const secondary = isDark ? "text-zinc-500" : "text-zinc-400";
  const progress = session.total > 0 ? (100 * session.settled) / session.total : 0;

  const markKnown = async () => {
    await session.suspend();
    toast("Marked as known. Restore it from the list's page.");
  };

  const header = (
    <View className="px-4 pt-14 pb-3">
      <View className="flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="End session"
          className="w-9 h-9 items-center justify-center -ml-2"
        >
          <X size={22} color={isDark ? "#A1A1AA" : "#71717A"} />
        </Pressable>
        <View className="flex-1 items-center">
          <Text
            className={`text-subheadline font-semibold ${isDark ? "text-zinc-200" : "text-zinc-700"}`}
          >
            {session.total > 0 ? `Settled ${session.settled} of ${session.total}` : ""}
          </Text>
          {caption && session.total > 0 && (
            <Text className={`text-caption2 ${secondary}`}>{caption}</Text>
          )}
        </View>
        <View className="w-9" />
      </View>
      <View className={`h-1 rounded-full mt-3 overflow-hidden ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`}>
        <View className="h-full bg-accent" style={{ width: `${progress}%` }} />
      </View>
    </View>
  );

  if (session.loading) {
    return <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"}`}>{header}</View>;
  }

  if (session.finished) {
    const { tally } = session;
    const empty = session.total === 0 && tally.ratings === 0;
    return (
      <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"}`}>
        {header}
        <View className="flex-1 items-center justify-center px-8">
          {empty && reviewOnly ? (
            <>
              <Text className={`text-title2 font-bold ${isDark ? "text-zinc-50" : "text-zinc-900"}`}>
                Nothing due right now
              </Text>
              <Text className={`text-footnote text-center mt-2 ${secondary}`}>
                Every card is scheduled for later. Start a normal session to learn new words.
              </Text>
              <Pressable
                onPress={() => router.replace(`/study/session?lists=${listsParam}&mode=mixed`)}
                className={`mt-6 px-5 py-2.5 rounded-md border ${isDark ? "border-zinc-700" : "border-zinc-300"}`}
              >
                <Text className="text-subheadline font-semibold text-accent dark:text-accent-light">
                  Learn new words
                </Text>
              </Pressable>
            </>
          ) : empty && mode === "mixed" && session.budgetSpent ? (
            <>
              <Text className={`text-title2 font-bold ${isDark ? "text-zinc-50" : "text-zinc-900"}`}>
                Done for today
              </Text>
              <Text className={`text-footnote text-center mt-2 ${secondary}`}>
                Nothing is due and today's new words are all introduced. Keep going if you like.
              </Text>
              <Pressable
                onPress={() => router.replace(`/study/session?lists=${listsParam}&mode=learn`)}
                className={`mt-6 px-5 py-2.5 rounded-md border ${isDark ? "border-zinc-700" : "border-zinc-300"}`}
              >
                <Text className="text-subheadline font-semibold text-accent dark:text-accent-light">
                  Learn more
                </Text>
              </Pressable>
            </>
          ) : empty ? (
            <>
              <Text className={`text-title2 font-bold ${isDark ? "text-zinc-50" : "text-zinc-900"}`}>
                Nothing to study
              </Text>
              <Text className={`text-footnote text-center mt-2 ${secondary}`}>
                This list has no words left to learn or review right now.
              </Text>
            </>
          ) : (
            <>
              <Text className={`text-title2 font-bold ${isDark ? "text-zinc-50" : "text-zinc-900"}`}>
                {reviewOnly ? "Review complete" : "Session complete"}
              </Text>
              <Text className={`text-body text-center mt-2 ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                {sessionSummary(tally)}
              </Text>
            </>
          )}
          <Pressable
            onPress={() => router.back()}
            className="mt-8 px-6 py-3 rounded-md bg-accent active:bg-accent-dark"
          >
            <Text className="text-subheadline font-semibold text-white">Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? "bg-zinc-950" : "bg-white"}`}>
      {header}

      <View className="flex-1 px-4">
        <FlashCard
          content={session.content}
          revealed={session.revealed}
          onReveal={session.reveal}
          stage={session.stage}
          readingMode={readingMode}
          cardFront={cardFront}
          reduceMotion={reduceMotion}
          onSeeMore={() => {
            if (session.content) router.push(`/word/${session.content.entry.id}`);
          }}
          onMarkKnown={markKnown}
          onPressKanji={(char) => router.push(`/kanji/${char}`)}
        />
      </View>

      {/* Fixed height either way, so the card does not jump on reveal. */}
      <View className="px-4 pt-4 pb-6 min-h-[96px] justify-center">
        {session.revealed ? (
          <SRSRatingBar intervals={session.intervals} onRate={session.rate} />
        ) : (
          <Text className={`text-center text-footnote ${secondary}`}>
            Think of the answer, then tap the card.
          </Text>
        )}
      </View>
    </View>
  );
}
