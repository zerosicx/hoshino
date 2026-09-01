import { View, Text } from "react-native";
import type { FuriganaPair } from "@/utils/furigana";

type FuriganaSize = "sentence" | "sm" | "default" | "lg" | "xl";

interface FuriganaTextProps {
  pairs: FuriganaPair[];
  size?: FuriganaSize;
  showReading?: boolean;
}

const sizeStyles: Record<
  FuriganaSize,
  { base: string; furi: string; furiMin: number }
> = {
  sentence: {
    base: "text-body",
    furi: "text-[10px] leading-[12px]",
    furiMin: 12,
  },
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
  const bold = size !== "sentence";

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
            className={`${s.base} ${bold ? "font-bold" : ""} text-zinc-900 dark:text-zinc-50`}
          >
            {pair.base}
          </Text>
        </View>
      ))}
    </View>
  );
}
