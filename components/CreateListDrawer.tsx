import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import BottomDrawer from "./BottomDrawer";
import { useTheme } from "@/hooks/useTheme";

interface CreateListDrawerProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export default function CreateListDrawer({
  visible,
  onClose,
  onCreate,
}: CreateListDrawerProps) {
  const [name, setName] = useState("");
  const { isDark } = useTheme();

  // Reopening should offer an empty field, not the last thing typed.
  useEffect(() => {
    if (visible) setName("");
  }, [visible]);

  const trimmed = name.trim();

  return (
    <BottomDrawer visible={visible} title="New list" onClose={onClose}>
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
          onPress={onClose}
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
    </BottomDrawer>
  );
}
