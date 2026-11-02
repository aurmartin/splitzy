import Button from "@/components/button";
import { render, screen, userEvent } from "@testing-library/react-native";
import * as React from "react";

it("renders correctly", async () => {
  await render(<Button>Press me!</Button>);
  expect(screen.toJSON()).toMatchSnapshot();
});

it("renders correctly with type", async () => {
  await render(<Button type="primary">Press me!</Button>);
  expect(screen.toJSON()).toMatchSnapshot();
});

it("renders correctly with style", async () => {
  await render(<Button style={{ backgroundColor: "red" }}>Press me!</Button>);
  expect(screen.toJSON()).toMatchSnapshot();
});

it("handles onPress events", async () => {
  const user = userEvent.setup();

  const onPressMock = jest.fn();
  await render(<Button onPress={onPressMock}>Press me!</Button>);

  await user.press(screen.getByText("Press me!"));
  expect(onPressMock).toHaveBeenCalled();
});

it("renders disabled state correctly", async () => {
  const onPressMock = jest.fn();
  await render(
    <Button disabled onPress={onPressMock}>
      Press me!
    </Button>,
  );
  expect(screen.toJSON()).toMatchSnapshot();
});
