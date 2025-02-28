import * as React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import TextInput from "../text-input";

describe("TextInput", () => {
  it("renders correctly", () => {
    const tree = render(<TextInput placeholder="Enter text" />);
    expect(tree).toMatchSnapshot();
  });

  it("renders with label when provided", () => {
    const { getByText } = render(
      <TextInput label="Test Label" placeholder="Enter text" />,
    );

    expect(getByText("Test Label")).toBeTruthy();
  });

  it("handles text changes correctly", () => {
    const mockOnChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <TextInput placeholder="Enter text" onChangeText={mockOnChangeText} />,
    );

    const input = getByPlaceholderText("Enter text");
    fireEvent.changeText(input, "Hello World");

    expect(mockOnChangeText).toHaveBeenCalledWith("Hello World");
  });
});
