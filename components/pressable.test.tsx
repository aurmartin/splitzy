import * as React from "react";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { Pressable } from "@/components/pressable";

describe("Pressable", () => {
  it("renders correctly", async () => {
    await render(
      <Pressable>
        <Text>Test</Text>
      </Pressable>,
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
