import Card from "@/components/card";
import { render, screen, userEvent } from "@testing-library/react-native";
import * as React from "react";
import { Text } from "react-native";

it("renders correctly with children", () => {
  render(
    <Card>
      <Text>Card content</Text>
    </Card>,
  );
  expect(screen.toJSON()).toMatchSnapshot();
});

it("handles onPress events", async () => {
  const user = userEvent.setup();

  const onPressMock = jest.fn();
  render(
    <Card onPress={onPressMock}>
      <Text>Clickable card</Text>
    </Card>,
  );

  await user.press(screen.getByText("Clickable card"));
  expect(onPressMock).toHaveBeenCalled();
});

it("renders as View when no onPress provided", () => {
  render(
    <Card>
      <Text>Static card</Text>
    </Card>,
  );
  expect(screen.toJSON()).toMatchSnapshot();
});

it("renders as Pressable when onPress provided", () => {
  render(
    <Card onPress={() => {}}>
      <Text>Clickable card</Text>
    </Card>,
  );
  expect(screen.toJSON()).toMatchSnapshot();
});
