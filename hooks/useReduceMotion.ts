import { useReducedMotion } from "react-native-reanimated";
import { useSettingsStore } from "@/stores/settingsStore";

/**
 * Whether animations should be skipped: the in-app setting, falling back to
 * the device's accessibility preference when it says to follow the system.
 */
export function useReduceMotion(): boolean {
  const motionMode = useSettingsStore((s) => s.motionMode);
  const system = useReducedMotion();
  if (motionMode === "reduced") return true;
  if (motionMode === "full") return false;
  return system;
}
