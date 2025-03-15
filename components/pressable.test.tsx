import * as React from "react";
import { render, screen } from "@testing-library/react-native";
import { Pressable } from "@/components/pressable";

describe("Pressable", () => {
  it("renders correctly", () => {
    render(<Pressable>Test</Pressable>);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
