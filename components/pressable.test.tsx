import * as React from "react";
import { render } from "@testing-library/react-native";
import { Pressable } from "@/components/pressable";

describe("Pressable", () => {
  it("renders correctly", () => {
    const tree = render(<Pressable>Test</Pressable>);
    expect(tree).toMatchSnapshot();
  });
});
