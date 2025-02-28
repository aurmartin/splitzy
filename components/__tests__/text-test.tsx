import * as React from "react";
import { render } from "@testing-library/react-native";

import { Text } from "../text";

it("renders correctly", () => {
  const tree = render(<Text>Snapshot test!</Text>);
  expect(tree).toMatchSnapshot();
});

it("renders correctly with type", () => {
  const tree = render(<Text type="title">Snapshot test!</Text>);
  expect(tree).toMatchSnapshot();
});

it("renders correctly with style", () => {
  const tree = render(<Text style={{ fontSize: 20 }}>Snapshot test!</Text>);
  expect(tree).toMatchSnapshot();
});
