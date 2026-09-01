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
import { Minus, Plus } from "lucide-react-native";
import { useTheme } from "@/hooks/useTheme";

/** How far the row must travel before releasing it counts as a trigger. */
const TRIGGER = 80;

type SwipeActionKind = "add" | "remove";

interface SwipeActionProps {
  action: SwipeActionKind;
  onTrigger: () => void;
  children: ReactNode;
}

export default function SwipeAction({
  action,
  onTrigger,
  children,
}: SwipeActionProps) {
  const offset = useSharedValue(0);
  const { isDark } = useTheme();

  // Adding pulls the row right, removing pulls it left, which keeps the two
  // gestures from being mistaken for one another.
  const adding = action === "add";
  const direction = adding ? 1 : -1;

  const pan = Gesture.Pan()
    .activeOffsetX(14 * direction)
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const travelled = e.translationX * direction;
      offset.value = Math.min(Math.max(travelled, 0), TRIGGER * 1.35);
    })
    .onEnd(() => {
      if (offset.value >= TRIGGER) runOnJS(onTrigger)();
      offset.value = withSpring(0, { damping: 22, stiffness: 240 });
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value * direction }],
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
        className={`absolute ${adding ? "left-2" : "right-2"} top-0 bottom-0 justify-center`}
      >
        <View
          className={`w-9 h-9 rounded-full items-center justify-center ${
            adding ? "bg-accent" : "bg-red-600"
          }`}
        >
          {adding ? (
            <Plus size={18} color="#FFFFFF" />
          ) : (
            <Minus size={18} color="#FFFFFF" />
          )}
        </View>
      </Animated.View>

      <GestureDetector gesture={pan}>
        {/* Opaque so the icon stays hidden until the row moves off it. */}
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
