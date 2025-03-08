import * as React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import FAB from "./fab";
import { Text } from "react-native";

describe("FAB", () => {
  it("renders correctly", () => {
    const mockOnPress = jest.fn();
    const tree = render(
      <FAB onPress={mockOnPress}>
        <Text>+</Text>
      </FAB>,
    );
    expect(tree).toMatchSnapshot();
  });

  it("handles press correctly", () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <FAB onPress={mockOnPress}>
        <Text>+</Text>
      </FAB>,
    );

    fireEvent.press(getByTestId("fab-button"));
    expect(mockOnPress).toHaveBeenCalled();
  });
});
