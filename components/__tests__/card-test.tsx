import * as React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";

import Card from "@/components/card";

it("renders correctly with children", () => {
  const tree = render(
    <Card>
      <Text>Card content</Text>
    </Card>,
  );
  expect(tree).toMatchSnapshot();
});

it("handles onPress events", () => {
  const onPressMock = jest.fn();
  const { getByText } = render(
    <Card onPress={onPressMock}>
      <Text>Clickable card</Text>
    </Card>,
  );

  fireEvent.press(getByText("Clickable card"));
  expect(onPressMock).toHaveBeenCalled();
});

it("renders as View when no onPress provided", () => {
  const tree = render(
    <Card>
      <Text>Static card</Text>
    </Card>,
  );
  expect(tree).toMatchSnapshot();
});

it("renders as Pressable when onPress provided", () => {
  const tree = render(
    <Card onPress={() => {}}>
      <Text>Clickable card</Text>
    </Card>,
  );
  expect(tree).toMatchSnapshot();
});
