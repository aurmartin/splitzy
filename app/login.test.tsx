import LoginScreen from "@/app/login";
import { system } from "@/lib/test-setup";
import { renderRouter } from "@/lib/test-utils";
import { screen, userEvent } from "@testing-library/react-native";
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

    await user.type(screen.getByPlaceholderText("E-mail"), "test@test.com");
    await user.press(screen.getByRole("button"));

    await screen.findByText(
      "Vérifiez votre e-mail pour un lien magique de connexion.",
    );
  });

  it("should handle sign in error", async () => {
    const user = userEvent.setup();
    renderRouter(routerContext, system, { initialUrl: "/login" });

    (system.supabaseConnector.signInWithOtp as jest.Mock).mockImplementation(
      () => {
        throw new Error("Invalid email");
      },
    );

    await user.type(screen.getByPlaceholderText("E-mail"), "test@test.com");
    await user.press(screen.getByRole("button"));

    await screen.findByText("Invalid email");
  });

  it("should redirect to protected route if user is signed in", async () => {
    (system.supabaseConnector.getSession as jest.Mock).mockResolvedValueOnce({
      data: {
        session: {
          user: { email: "test@test.com" },
        },
      },
    });

    renderRouter(routerContext, system, { initialUrl: "/login" });

    await screen.findByText("Protected");
  });
});
