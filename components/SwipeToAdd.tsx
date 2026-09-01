import { ReactNode } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Plus } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";

/** How far the row must travel before releasing it counts as an add. */
const TRIGGER = 80;

interface SwipeToAddProps {
  onAdd: () => void;
  children: ReactNode;
}

/**
 * Drags a row rightwards to reveal a plus, adding on release.
 *
 * The gesture only claims a drag that is clearly horizontal, so scrolling the
 * results list still works normally.
 */
export default function SwipeToAdd({ onAdd, children }: SwipeToAddProps) {
  const offset = useSharedValue(0);
  const { isDark } = useTheme();

  const pan = Gesture.Pan()
    .activeOffsetX(14)
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      offset.value = Math.min(Math.max(e.translationX, 0), TRIGGER * 1.35);
    })
    .onEnd(() => {
      if (offset.value >= TRIGGER) runOnJS(onAdd)();
      offset.value = withSpring(0, { damping: 22, stiffness: 240 });
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [0, TRIGGER], [0, 1], "clamp"),
    transform: [
      { scale: interpolate(offset.value, [0, TRIGGER], [0.6, 1], "clamp") },
    ],
  }));

  return (
    <View className="overflow-hidden">
      <Animated.View
        style={iconStyle}
        pointerEvents="none"
        className="absolute left-2 top-0 bottom-0 justify-center"
      >
        <View className="w-9 h-9 rounded-full bg-accent items-center justify-center">
          <Plus size={18} color="#FFFFFF" />
        </View>
      </Animated.View>

      <GestureDetector gesture={pan}>
        {/* Opaque so the plus stays hidden until the row moves off it. */}
        <Animated.View
          style={rowStyle}
          className={isDark ? "bg-zinc-950" : "bg-white"}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
