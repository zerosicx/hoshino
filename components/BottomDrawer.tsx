import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

interface BottomDrawerProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A panel that slides up from the bottom, dimming what is behind it.
 *
 * Uses Modal so it escapes the tab navigator and covers the tab bar; without
 * that the drawer would open underneath it.
 */
export default function BottomDrawer({
  visible,
  title,
  onClose,
  children,
}: BottomDrawerProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(120)}
          className="absolute inset-0 bg-black/50"
        >
          <Pressable className="flex-1" onPress={onClose} />
        </Animated.View>

        {/* Both platforms: under edge-to-edge Android no longer resizes the
            Modal's window for the keyboard, so the drawer pads itself up. */}
        <KeyboardAvoidingView behavior="padding">
          <Animated.View
            entering={SlideInDown.duration(220)}
            style={{ paddingBottom: insets.bottom + 16 }}
            className={`rounded-t-xl px-4 pt-3 ${isDark ? "bg-zinc-900" : "bg-white"}`}
          >
            <View
              className={`self-center w-10 h-1 rounded-full mb-4 ${isDark ? "bg-zinc-700" : "bg-zinc-300"}`}
            />
            <Text
              className={`text-headline font-semibold mb-3 ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
            >
              {title}
            </Text>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
