import * as React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { TopBar } from "../top-bar";
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

  it("renders correctly", () => {
    const tree = render(<TopBar />);
    expect(tree).toMatchSnapshot();
  });

  it("renders title when provided", () => {
    const title = "Test Title";
    const { getByText } = render(<TopBar title={title} />);

    expect(getByText(title)).toBeTruthy();
  });

  it("handles back button press correctly", () => {
    const { getByTestId } = render(<TopBar />);

    fireEvent.press(getByTestId("topbar-back-button"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("renders right actions when provided", () => {
    const actionText = "Action";
    const rightActions = [
      <Pressable key="1" testID="right-action">
        <Text>{actionText}</Text>
      </Pressable>,
    ];

    const { getByTestId, getByText } = render(
      <TopBar rightActions={rightActions} />,
    );

    expect(getByTestId("right-action")).toBeTruthy();
    expect(getByText(actionText)).toBeTruthy();
  });
});
