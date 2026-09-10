import { fireEvent, render, screen } from "@testing-library/react-native";
import { KeyboardAvoidingView } from "react-native";
import CreateListDialog from "./CreateListDialog";

function renderDialog() {
  const onCancel = jest.fn();
  const onCreate = jest.fn();
  render(<CreateListDialog onCancel={onCancel} onCreate={onCreate} />);
  return { onCancel, onCreate };
}

describe("CreateListDialog", () => {
  it("opens with the keyboard by focusing the name field", () => {
    renderDialog();
    expect(screen.getByPlaceholderText("List name").props.autoFocus).toBe(true);
  });

  // The card sits in the upper part of the screen and the keyboard pads the
  // bottom, so the two can never overlap on either platform.
  it("moves out of the keyboard's way", () => {
    renderDialog();
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe(
      "padding"
    );
  });

  it("does not create from an empty or blank name", () => {
    const { onCreate } = renderDialog();
    fireEvent.press(screen.getByText("Create"));
    fireEvent.changeText(screen.getByPlaceholderText("List name"), "   ");
    fireEvent.press(screen.getByText("Create"));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates with the trimmed name", () => {
    const { onCreate } = renderDialog();
    fireEvent.changeText(screen.getByPlaceholderText("List name"), " Verbs ");
    fireEvent.press(screen.getByText("Create"));
    expect(onCreate).toHaveBeenCalledWith("Verbs");
  });

  it("creates from the keyboard's done key", () => {
    const { onCreate } = renderDialog();
    const input = screen.getByPlaceholderText("List name");
    fireEvent.changeText(input, "Verbs");
    fireEvent(input, "submitEditing");
    expect(onCreate).toHaveBeenCalledWith("Verbs");
  });

  it("cancels from the button and from the backdrop", () => {
    const { onCancel } = renderDialog();
    fireEvent.press(screen.getByText("Cancel"));
    fireEvent.press(screen.getByLabelText("Dismiss"));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
