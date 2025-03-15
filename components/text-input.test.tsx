import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { TextInput } from "./text-input";

describe("TextInput", () => {
  it("renders correctly", () => {
    render(<TextInput placeholder="Enter text" />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("renders with label when provided", () => {
    render(<TextInput label="Test Label" placeholder="Enter text" />);
    screen.getByText("Test Label");
  });

  it("handles text changes correctly", async () => {
    const user = userEvent.setup();
    const mockOnChangeText = jest.fn();
    render(
      <TextInput placeholder="Enter text" onChangeText={mockOnChangeText} />,
    );

    const input = screen.getByPlaceholderText("Enter text");
    await user.type(input, "Hello World");

    expect(mockOnChangeText).toHaveBeenCalledWith("Hello World");
  });
});
