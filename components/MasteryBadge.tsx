import { Text, View } from "react-native";
import { STAGES, type Stage } from "@/services/scheduler";

interface MasteryBadgeProps {
  stage: Stage;
  /** Name only, for a list row where five dots would be noise. */
  compact?: boolean;
}

export const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  learning: "Learning",
  familiar: "Familiar",
  known: "Known",
  mastered: "Mastered",
};

/**
 * Where a word is on the mastery ladder: the rung's name and, unless compact,
 * five dots filled up to it (DESIGN_SYSTEM.md §9.3 badge, §9.12). One colour
 * for every rung — the ladder says how far, the colour never says how well.
 */
export default function MasteryBadge({ stage, compact = false }: MasteryBadgeProps) {
  const filled = STAGES.indexOf(stage) + 1;

  return (
    <View
      accessibilityLabel={`${STAGE_LABEL[stage]}, ${filled} of ${STAGES.length}`}
      className="flex-row items-center gap-1.5 bg-accent/10 px-2 py-0.5 rounded-md"
    >
      <Text className="text-caption2 font-semibold text-accent dark:text-accent-light">
        {STAGE_LABEL[stage]}
      </Text>
      {!compact && (
        <View className="flex-row items-center gap-0.5" testID="mastery-ladder">
          {STAGES.map((rung, i) => (
            <View
              key={rung}
              testID={i < filled ? "rung-filled" : "rung-empty"}
              className={`w-1.5 h-1.5 rounded-full ${i < filled ? "bg-accent dark:bg-accent-light" : "bg-accent/25"}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}
