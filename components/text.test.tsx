import * as React from "react";
import { render, screen } from "@testing-library/react-native";

import { Text } from "./text";

it("renders correctly", () => {
  render(<Text>Snapshot test!</Text>);
  expect(screen.toJSON()).toMatchSnapshot();
});

it("renders correctly with type", () => {
  render(<Text type="title">Snapshot test!</Text>);
  expect(screen.toJSON()).toMatchSnapshot();
});

it("renders correctly with style", () => {
  render(<Text style={{ fontSize: 20 }}>Snapshot test!</Text>);
  expect(screen.toJSON()).toMatchSnapshot();
});
