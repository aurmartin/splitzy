import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { TopBar } from "./top-bar";
import { Text, Pressable } from "react-native";

// Mock expo-router
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

describe("TopBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly", async () => {
    await render(<TopBar />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("renders title when provided", async () => {
    const title = "Test Title";
    await render(<TopBar title={title} />);

    screen.getByText(title);
  });

  it("handles back button press correctly", async () => {
    const user = userEvent.setup();
    await render(<TopBar />);

    await user.press(screen.getByTestId("topbar-back-button"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("renders right actions when provided", async () => {
    const actionText = "Action";
    const rightActions = [
      <Pressable key="1" testID="right-action">
        <Text>{actionText}</Text>
      </Pressable>,
    ];

    await render(<TopBar rightActions={rightActions} />);

    screen.getByTestId("right-action");
    screen.getByText(actionText);
  });
});
