import LoginScreen from "@/app/login";
import { server, system } from "@/lib/test-setup";
import { renderRouter, setFakeSession } from "@/lib/test-utils";
import { screen, userEvent } from "@testing-library/react-native";
import { HttpResponse, http } from "msw";
import { Text } from "react-native";

const routerContext = {
  "/login": () => <LoginScreen />,
  "/protected": () => <Text>Protected</Text>,
};

describe("LoginScreen", () => {
  it("should render snapshot", () => {
    renderRouter(routerContext, system, { initialUrl: "/login" });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("should allow user to sign in with email", async () => {
    const user = userEvent.setup();
    renderRouter(routerContext, system, { initialUrl: "/login" });

    await user.type(screen.getByPlaceholderText("Email"), "test@test.com");
    await user.press(screen.getByRole("button"));

    await screen.findByText("Check your email for a magic link to sign in.");
  });

  it("should handle sign in error", async () => {
    const user = userEvent.setup();
    renderRouter(routerContext, system, { initialUrl: "/login" });

    server.use(
      http.post("http://localhost:50001/auth/v1/otp", () =>
        HttpResponse.json({ error: "Invalid email" }, { status: 401 }),
      ),
    );

    await user.type(screen.getByPlaceholderText("Email"), "test@test.com");
    await user.press(screen.getByRole("button"));

    await screen.findByText("Invalid email");
  });

  it("should redirect to protected route if user is signed in", async () => {
    setFakeSession(system);

    renderRouter(routerContext, system, { initialUrl: "/login" });

    await screen.findByText("Protected");
  });
});
