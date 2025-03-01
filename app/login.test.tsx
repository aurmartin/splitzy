import LoginScreen from "@/app/login";
import { System } from "@/lib/system";
import {
  clearDatabase,
  createDatabase,
  createSupabaseServer,
  renderRouter,
  setFakeSession,
} from "@/lib/test-utils";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { HttpResponse, http } from "msw";
import { Text } from "react-native";

const server = createSupabaseServer();
let system: System;

beforeEach(() => {
  clearDatabase(system.db);
});

beforeAll(() => {
  server.listen();
  system = new System(createDatabase());
});

afterEach(() => server.resetHandlers());

afterAll(() => {
  server.close();
  system.dispose();
});

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
    renderRouter(routerContext, system, { initialUrl: "/login" });

    const emailInput = screen.getByPlaceholderText("Email");
    const signInButton = screen.getByText("Login or Create Account");

    fireEvent.changeText(emailInput, "test@test.com");
    fireEvent.press(signInButton);

    expect(screen.getByText("Signing in..."));

    await waitFor(() =>
      expect(screen.getByText("Check your email for a magic link to sign in.")),
    );
  });

  it("should handle sign in error", async () => {
    renderRouter(routerContext, system, { initialUrl: "/login" });

    server.use(
      http.post("http://localhost:50001/auth/v1/otp", () =>
        HttpResponse.json({ error: "Invalid email" }, { status: 401 }),
      ),
    );

    const emailInput = screen.getByPlaceholderText("Email");
    const signInButton = screen.getByText("Login or Create Account");

    fireEvent.changeText(emailInput, "test@test.com");
    fireEvent.press(signInButton);

    expect(screen.getByText("Signing in..."));

    await waitFor(() => expect(screen.getByText("Invalid email")));
  });

  it("should redirect to protected route if user is signed in", async () => {
    setFakeSession(system);

    renderRouter(routerContext, system, { initialUrl: "/login" });

    await waitFor(() => expect(screen.getByText("Protected")));
  });
});
