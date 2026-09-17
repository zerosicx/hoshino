import { useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface CreateListDialogProps {
  onCancel: () => void;
  onCreate: (name: string) => void;
}

/**
 * A floating card for naming a new list, dimming the screen behind it.
 *
 * The card sits two-fifths of the way down the free space, low enough for a
 * thumb to reach the buttons, and the keyboard pads the bottom, so when the
 * keyboard opens the free space shrinks and the card rises with it. Meant to be rendered by a transparent-modal route, not a
 * Modal: a Modal is its own window on Android, where autofocus and insets both
 * misfire.
 */
export default function CreateListDialog({
  onCancel,
  onCreate,
}: CreateListDialogProps) {
  const [name, setName] = useState("");
  const { isDark } = useTheme();
  const trimmed = name.trim();

  return (
    <View className="flex-1">
      <Pressable
        accessibilityLabel="Dismiss"
        onPress={onCancel}
        className="absolute inset-0 bg-black/50"
      />

      <KeyboardAvoidingView
        behavior="padding"
        pointerEvents="box-none"
        className="flex-1 px-6"
      >
        <View style={{ flex: 2 }} pointerEvents="none" />

        <View
          className={`rounded-lg p-4 border ${
            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
          }`}
        >
          <Text
            className={`text-headline font-semibold mb-3 ${isDark ? "text-zinc-50" : "text-zinc-900"}`}
          >
            New list
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="List name"
            placeholderTextColor={isDark ? "#52525B" : "#A1A1AA"}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => trimmed && onCreate(trimmed)}
            className={`px-3 py-3 rounded-md text-body border ${
              isDark
                ? "bg-zinc-800 border-zinc-700 text-zinc-50"
                : "bg-zinc-50 border-zinc-200 text-zinc-900"
            }`}
          />

          <View className="flex-row gap-2 mt-3">
            <Pressable
              onPress={onCancel}
              className={`flex-1 py-3 rounded-md items-center border ${
                isDark ? "border-zinc-700" : "border-zinc-200"
              }`}
            >
              <Text
                className={`text-subheadline font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={!trimmed}
              onPress={() => onCreate(trimmed)}
              className={`flex-1 py-3 rounded-md items-center ${
                trimmed ? "bg-accent" : isDark ? "bg-zinc-800" : "bg-zinc-200"
              }`}
            >
              <Text
                className={`text-subheadline font-semibold ${
                  trimmed ? "text-white" : isDark ? "text-zinc-600" : "text-zinc-400"
                }`}
              >
                Create
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Three parts below to two above puts the card 40% of the way down. */}
        <View style={{ flex: 3 }} pointerEvents="none" />
      </KeyboardAvoidingView>
    </View>
  );
}
