import * as React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import Button from "@/components/button";

it("renders correctly", () => {
  const tree = render(<Button>Press me!</Button>);
  expect(tree).toMatchSnapshot();
});

it("renders correctly with type", () => {
  const tree = render(<Button type="primary">Press me!</Button>);
  expect(tree).toMatchSnapshot();
});

it("renders correctly with style", () => {
  const tree = render(
    <Button style={{ backgroundColor: "red" }}>Press me!</Button>,
  );
  expect(tree).toMatchSnapshot();
});

it("handles onPress events", () => {
  const onPressMock = jest.fn();
  const { getByText } = render(
    <Button onPress={onPressMock}>Press me!</Button>,
  );

  fireEvent.press(getByText("Press me!"));
  expect(onPressMock).toHaveBeenCalled();
});

it("renders disabled state correctly", () => {
  const onPressMock = jest.fn();
  const tree = render(
    <Button disabled onPress={onPressMock}>
      Press me!
    </Button>,
  );
  expect(tree).toMatchSnapshot();
});
