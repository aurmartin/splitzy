import * as React from "react";
import { render, screen } from "@testing-library/react-native";
import Label from "./label";

describe("Label", () => {
  it("renders correctly", () => {
    render(<Label>Test Label</Label>);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
