import { render } from "@testing-library/react-native";
import * as React from "react";
import { Text } from "react-native";
import { Screen } from "./screen";

describe("Screen", () => {
  it("renders correctly", () => {
    const tree = render(
      <Screen>
        <Text>Test Content</Text>
      </Screen>,
    );
    expect(tree).toMatchSnapshot();
  });
});
