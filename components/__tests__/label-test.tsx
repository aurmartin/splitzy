import * as React from "react";
import { render } from "@testing-library/react-native";
import Label from "../label";

describe("Label", () => {
  it("renders correctly", () => {
    const tree = render(<Label>Test Label</Label>);
    expect(tree).toMatchSnapshot();
  });
});
