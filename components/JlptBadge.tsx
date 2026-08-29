import { View, Text } from "react-native";

interface JlptBadgeProps {
  level: number | null;
}

const badgeColors: Record<number, { bg: string; text: string }> = {
  5: { bg: "bg-jlpt-n5/10", text: "text-jlpt-n5" },
  4: { bg: "bg-jlpt-n4/10", text: "text-jlpt-n4" },
  3: { bg: "bg-jlpt-n3/10", text: "text-jlpt-n3" },
  2: { bg: "bg-jlpt-n2/10", text: "text-jlpt-n2" },
  1: { bg: "bg-jlpt-n1/10", text: "text-jlpt-n1" },
};

export default function JlptBadge({ level }: JlptBadgeProps) {
  if (!level) return null;

  const colors = badgeColors[level];
  if (!colors) return null;

  return (
    <View className={`${colors.bg} px-2 py-0.5 rounded-full`}>
      <Text className={`${colors.text} text-caption2 font-semibold`}>
        N{level}
      </Text>
    </View>
  );
}
