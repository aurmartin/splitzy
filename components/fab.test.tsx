import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import FAB from "./fab";
import { Text } from "react-native";

describe("FAB", () => {
  it("renders correctly", async () => {
    const mockOnPress = jest.fn();
    await render(
      <FAB onPress={mockOnPress}>
        <Text>+</Text>
      </FAB>,
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("handles press correctly", async () => {
    const user = userEvent.setup();

    const mockOnPress = jest.fn();
    await render(
      <FAB onPress={mockOnPress}>
        <Text>+</Text>
      </FAB>,
    );

    await user.press(screen.getByTestId("fab-button"));
    expect(mockOnPress).toHaveBeenCalled();
  });
});
