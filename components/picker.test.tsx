import * as React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import Picker from "./picker";
import { Picker as RNPicker } from "@react-native-picker/picker";

describe("Picker", () => {
  it("renders correctly", () => {
    const mockOnValueChange = jest.fn();
    const tree = render(
      <Picker
        label="Test Label"
        selectedValue="option1"
        onValueChange={mockOnValueChange}
      >
        <RNPicker.Item label="Option 1" value="option1" />
        <RNPicker.Item label="Option 2" value="option2" />
      </Picker>,
    );
    expect(tree).toMatchSnapshot();
  });

  it("displays the label correctly", () => {
    const mockOnValueChange = jest.fn();
    const { getByText } = render(
      <Picker
        label="Test Label"
        selectedValue="option1"
        onValueChange={mockOnValueChange}
      >
        <RNPicker.Item label="Option 1" value="option1" />
      </Picker>,
    );

    expect(getByText("Test Label")).toBeTruthy();
  });

  it("handles value changes correctly", () => {
    const mockOnValueChange = jest.fn();
    const { getByTestId } = render(
      <Picker
        label="Test Label"
        selectedValue="option1"
        onValueChange={mockOnValueChange}
      >
        <RNPicker.Item label="Option 1" value="option1" />
        <RNPicker.Item label="Option 2" value="option2" />
      </Picker>,
    );

    fireEvent(getByTestId("picker"), "onValueChange", "option2");
    expect(mockOnValueChange).toHaveBeenCalledWith("option2");
  });
});
