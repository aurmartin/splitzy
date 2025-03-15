import { ExternalLink } from "@/components/external-link";
import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { openBrowserAsync } from "expo-web-browser";

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(),
}));

describe("ExternalLink", () => {
  it("renders correctly", () => {
    render(<ExternalLink href="" />);

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("opens browser on mobile", async () => {
    const href = "https://www.google.fr/";
    const user = userEvent.setup();
    render(<ExternalLink testID="link" href={href} />);

    await user.press(screen.getByTestId("link"));

    expect(openBrowserAsync).toHaveBeenLastCalledWith(href);
  });
});
