import RedirectScreen from "@/app/redirect";
import { system } from "@/lib/test-setup";
import { generateAccessToken, renderRouter } from "@/lib/test-utils";
import { screen, waitFor } from "@testing-library/react-native";
import * as Linking from "expo-linking";
import { Text } from "react-native";

const routerContext = {
  "/redirect": () => <RedirectScreen />,
  "/login": () => <Text>Login Page</Text>,
  "/protected": () => <Text>Protected</Text>,
};

jest.mock("expo-linking", () => ({
  ...jest.requireActual("expo-linking"),
  useLinkingURL: jest.fn().mockReturnValue("/redirect"),
}));

describe("RedirectScreen", () => {
  it("should render snapshot", () => {
    renderRouter(routerContext, system, { initialUrl: "/redirect" });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("should redirect to protected route when correct link is provided", async () => {
    const url = `/redirect?access_token=${generateAccessToken()}&refresh_token=test-refresh-token`;
    jest.mocked(Linking.useLinkingURL).mockReturnValue(url);
    renderRouter(routerContext, system, { initialUrl: url });
    await waitFor(() => expect(screen.getByText("Protected")));
  });

  it("should redirect to login page when no access_token is provided", async () => {
    const url = `/redirect?refresh_token=test-refresh-token`;
    jest.mocked(Linking.useLinkingURL).mockReturnValue(url);
    renderRouter(routerContext, system, { initialUrl: url });
    await waitFor(() => expect(screen.getByText("Login Page")));
  });

  it("should redirect to login page when errorCode is provided", async () => {
    const url = `/redirect?errorCode=test-error-code`;
    jest.mocked(Linking.useLinkingURL).mockReturnValue(url);
    renderRouter(routerContext, system, { initialUrl: url });
    await waitFor(() => expect(screen.getByText("Login Page")));
  });
});
