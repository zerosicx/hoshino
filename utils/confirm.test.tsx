import { Alert, Platform } from "react-native";
import { confirmDestructive } from "./confirm";

type Buttons = { text: string; style?: string; onPress?: () => void }[];

const request = {
  title: "Delete Verbs?",
  message: "Its 12 words and their study progress go with it.",
  action: "Delete",
};

describe("confirmDestructive", () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

  afterEach(() => alert.mockClear());

  function pressButton(text: string) {
    const buttons = alert.mock.calls[0][2] as Buttons;
    buttons.find((b) => b.text === text)?.onPress?.();
  }

  it("asks with the title, the message, and the action named on the button", () => {
    confirmDestructive(request);

    const [title, message, buttons] = alert.mock.calls[0];
    expect(title).toBe(request.title);
    expect(message).toBe(request.message);
    expect(buttons).toEqual([
      expect.objectContaining({ text: "Cancel", style: "cancel" }),
      expect.objectContaining({ text: "Delete", style: "destructive" }),
    ]);
  });

  it("resolves true when the action is chosen", async () => {
    const answer = confirmDestructive(request);
    pressButton("Delete");
    await expect(answer).resolves.toBe(true);
  });

  it("resolves false on cancel", async () => {
    const answer = confirmDestructive(request);
    pressButton("Cancel");
    await expect(answer).resolves.toBe(false);
  });

  // React Native Web ships Alert.alert as an empty function, so a web user
  // would otherwise never be asked and never get an answer.
  it("uses the browser's own confirm on web", async () => {
    const os = Platform.OS;
    Platform.OS = "web";
    const confirm = jest.fn(() => true);
    (globalThis as { confirm?: unknown }).confirm = confirm;

    await expect(confirmDestructive(request)).resolves.toBe(true);
    expect(confirm).toHaveBeenCalledWith(`${request.title}\n\n${request.message}`);
    expect(alert).not.toHaveBeenCalled();

    Platform.OS = os;
    delete (globalThis as { confirm?: unknown }).confirm;
  });
});
