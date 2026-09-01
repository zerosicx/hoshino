import { Pressable, Text } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleAlert, Check } from "lucide-react-native";
import { useToastStore } from "@/stores/toastStore";
import { useTheme } from "@/hooks/useTheme";

/**
 * Mounted once at the root. Sits above the tab bar so it never covers it.
 */
export default function Toast() {
  const message = useToastStore((s) => s.message);
  const tone = useToastStore((s) => s.tone);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  if (!message) return null;

  const isError = tone === "error";
  const surface = isError
    ? "bg-red-600"
    : isDark
      ? "bg-zinc-100"
      : "bg-zinc-900";
  const textColour = isError
    ? "text-white"
    : isDark
      ? "text-zinc-900"
      : "text-zinc-50";
  const iconColour = isError ? "#FFFFFF" : isDark ? "#18181B" : "#FAFAFA";

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(140)}
      pointerEvents="box-none"
      style={{ bottom: insets.bottom + 72 }}
      className="absolute left-4 right-4 items-center"
    >
      <Pressable
        onPress={hide}
        className={`${surface} flex-row items-center gap-2 px-4 py-3 rounded-lg max-w-full`}
      >
        {isError ? (
          <CircleAlert size={16} color={iconColour} />
        ) : (
          <Check size={16} color={iconColour} />
        )}
        <Text className={`text-footnote ${textColour} flex-shrink`}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
