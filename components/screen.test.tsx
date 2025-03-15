import { render, screen } from "@testing-library/react-native";
import * as React from "react";
import { Text } from "react-native";
import { Screen } from "./screen";

describe("Screen", () => {
  it("renders correctly", () => {
    render(
      <Screen>
        <Text>Test Content</Text>
      </Screen>,
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
