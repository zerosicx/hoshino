import { Alert, Platform } from "react-native";

interface DestructiveRequest {
  title: string;
  message: string;
  /** The button that goes ahead, named for what it does: "Delete". */
  action: string;
}

/**
 * Asks before something that cannot be undone, in the platform's own dialog.
 *
 * Resolves true only when the action is chosen; dismissing the dialog any
 * other way is a no. On web `Alert.alert` is an empty function, so the
 * browser's confirm stands in.
 */
export function confirmDestructive(request: DestructiveRequest): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(
      globalThis.confirm(`${request.title}\n\n${request.message}`)
    );
  }

  return new Promise((resolve) => {
    Alert.alert(
      request.title,
      request.message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: request.action, style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
