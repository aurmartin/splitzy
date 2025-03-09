import { ExternalLink } from "@/components/external-link";
import * as React from "react";
import { render, userEvent } from "@testing-library/react-native";
import { openBrowserAsync } from "expo-web-browser";

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(),
}));

describe("ExternalLink", () => {
  it("renders correctly", () => {
    const tree = render(<ExternalLink href="" />);

    expect(tree).toMatchSnapshot();
  });

  it("opens browser on mobile", async () => {
    const href = "https://www.google.fr/";
    const user = userEvent.setup();
    const tree = render(<ExternalLink testID="link" href={href} />);

    await user.press(tree.getByTestId("link"));

    expect(openBrowserAsync).toHaveBeenLastCalledWith(href);
  });
});
