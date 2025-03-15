import * as React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import Picker from "./picker";
import { Picker as RNPicker } from "@react-native-picker/picker";

describe("Picker", () => {
  it("renders correctly", () => {
    const mockOnValueChange = jest.fn();
    render(
      <Picker
        label="Test Label"
        selectedValue="option1"
        onValueChange={mockOnValueChange}
      >
        <RNPicker.Item label="Option 1" value="option1" />
        <RNPicker.Item label="Option 2" value="option2" />
      </Picker>,
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("displays the label correctly", () => {
    const mockOnValueChange = jest.fn();
    render(
      <Picker
        label="Test Label"
        selectedValue="option1"
        onValueChange={mockOnValueChange}
      >
        <RNPicker.Item label="Option 1" value="option1" />
      </Picker>,
    );

    screen.getByText("Test Label");
  });

  it("handles value changes correctly", async () => {
    const mockOnValueChange = jest.fn();
    render(
      <Picker
        label="Test Label"
        selectedValue="option1"
        onValueChange={mockOnValueChange}
      >
        <RNPicker.Item label="Option 1" value="option1" />
        <RNPicker.Item label="Option 2" value="option2" />
      </Picker>,
    );

    fireEvent(screen.getByTestId("picker"), "onValueChange", "option2");
    expect(mockOnValueChange).toHaveBeenCalledWith("option2");
  });
});
