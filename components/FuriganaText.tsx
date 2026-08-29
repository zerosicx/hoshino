import { View, Text } from "react-native";

type FuriganaSize = "sm" | "default" | "lg" | "xl";

interface FuriganaPair {
  base: string;
  reading: string;
}

interface FuriganaTextProps {
  pairs: FuriganaPair[];
  size?: FuriganaSize;
  showReading?: boolean;
}

const sizeStyles: Record<
  FuriganaSize,
  { base: string; furi: string; furiMin: number }
> = {
  sm: {
    base: "text-kanji-md",
    furi: "text-[9px] leading-[11px]",
    furiMin: 11,
  },
  default: {
    base: "text-kanji-lg",
    furi: "text-furigana",
    furiMin: 12,
  },
  lg: {
    base: "text-[40px] leading-[48px]",
    furi: "text-[12px] leading-[14px]",
    furiMin: 14,
  },
  xl: {
    base: "text-kanji-xl",
    furi: "text-[15px] leading-[18px]",
    furiMin: 18,
  },
};

export default function FuriganaText({
  pairs,
  size = "default",
  showReading = true,
}: FuriganaTextProps) {
  const s = sizeStyles[size];

  return (
    <View className="flex-row flex-wrap items-end">
      {pairs.map((pair, i) => (
        <View key={i} className="items-center">
          {showReading && (
            <Text
              className={`${s.furi} text-accent dark:text-accent-light text-center`}
              style={{ minHeight: s.furiMin }}
            >
              {pair.reading || " "}
            </Text>
          )}
          <Text
            className={`${s.base} font-bold text-zinc-900 dark:text-zinc-50`}
          >
            {pair.base}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Build furigana pairs from a kanji string and its reading.
 * For simple cases: each kanji character gets the full reading,
 * kana characters pass through with empty reading.
 */
export function buildFuriganaPairs(
  kanjiForm: string,
  reading: string
): FuriganaPair[] {
  if (!kanjiForm || kanjiForm === reading) {
    return reading.split("").map((ch) => ({ base: ch, reading: "" }));
  }

  const hasKanji = /[\u4E00-\u9FFF]/.test(kanjiForm);
  if (!hasKanji) {
    return kanjiForm.split("").map((ch) => ({ base: ch, reading: "" }));
  }

  // Simple approach: show full reading above the kanji form as one group
  return [{ base: kanjiForm, reading }];
}
