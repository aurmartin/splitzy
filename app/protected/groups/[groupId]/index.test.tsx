import GroupScreen from "@/app/protected/groups/[groupId]/index";
import { tables } from "@/lib/db/schema";
import { removeMe, setMe } from "@/lib/groups";
import { server, system } from "@/lib/test-setup";
import {
  buildExpenseRecord,
  buildGroupRecord,
  renderRouter,
} from "@/lib/test-utils";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { HttpResponse, http } from "msw";
import { Share, Text } from "react-native";

const share = jest.spyOn(Share, "share").mockResolvedValue({
  action: "sharedAction",
  activityType: null,
});

beforeEach(async () => {
  const group = buildGroupRecord({ id: "test-group-id" });
  await system.db.insert(tables.groups).values(group);
  setMe(system, group.id, "Alice");
});

const routerContext = {
  "/protected/groups/[groupId]/index": () => <GroupScreen />,
  "/protected/groups/[groupId]/set-me": () => <Text>Set me</Text>,
  "/protected/groups/[groupId]/new-expense": () => <Text>New expense</Text>,
  "/protected/groups/[groupId]/balance": () => <Text>Balance</Text>,
  "/protected/groups/[groupId]/expenses/[expenseId]": () => (
    <Text>Expense</Text>
  ),
};

const testGroupScreenUrl = "/protected/groups/test-group-id";

describe("GroupScreen", () => {
  it("should render correctly", () => {
    renderRouter(routerContext, system, { initialUrl: testGroupScreenUrl });
    expect(screen.toJSON()).toMatchSnapshot();
    expect(screen.getByText("test group name"));
  });

  it("should redirect to set-me if me is not set", () => {
    removeMe(system, "test-group-id");
    renderRouter(routerContext, system, { initialUrl: testGroupScreenUrl });
    expect(screen.getByText("Set me"));
  });

  it("should throw if group is not found", () => {
    expect(() =>
      renderRouter(routerContext, system, {
        initialUrl: "/protected/groups/not-found",
      }),
    ).toThrow("Group not found");
  });

  it("should share the group", () => {
    renderRouter(routerContext, system, { initialUrl: testGroupScreenUrl });
    fireEvent(screen.getByTestId("share-group"), "press");
    expect(share).toHaveBeenCalledTimes(1);
  });

  it("should render expenses", async () => {
    await system.db
      .insert(tables.expenses)
      .values(buildExpenseRecord({ groupId: "test-group-id" }));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await system.db.insert(tables.expenses).values(
      buildExpenseRecord({
        groupId: "test-group-id",
        createdAt: yesterday.toISOString(),
      }),
    );

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    await system.db.insert(tables.expenses).values(
      buildExpenseRecord({
        groupId: "test-group-id",
        createdAt: twoDaysAgo.toISOString(),
      }),
    );

    renderRouter(routerContext, system, { initialUrl: testGroupScreenUrl });

    expect(screen.getAllByText("test expense title"));
    expect(screen.getAllByText(/Alice/));
    expect(screen.getByText("Aujourd'hui"));
    expect(screen.getByText("Hier"));
    expect(
      screen.getByText(
        twoDaysAgo.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      ),
    );
  });

  it("should navigate to new expense", () => {
    renderRouter(routerContext, system, { initialUrl: testGroupScreenUrl });
    fireEvent(screen.getByTestId("fab-button"), "press");
    expect(screen.getByText("New expense"));
  });

  it("should navigate to expense", async () => {
    await system.db
      .insert(tables.expenses)
      .values(buildExpenseRecord({ groupId: "test-group-id" }));
    renderRouter(routerContext, system, { initialUrl: testGroupScreenUrl });
    fireEvent(screen.getByText("test expense title"), "press");
    expect(screen.getByText("Expense"));
  });

  it("should navigate to balance", () => {
    renderRouter(routerContext, system, { initialUrl: testGroupScreenUrl });
    fireEvent(screen.getByText("Remboursements"), "press");
    expect(screen.getByText("Balance"));
  });

  it("should refresh expenses", async () => {
    renderRouter(routerContext, system, { initialUrl: testGroupScreenUrl });
    expect(screen.getByText("Aucune dépense"));

    server.use(
      http.get("http://localhost:50001/rest/v1/expenses", () =>
        HttpResponse.json([buildExpenseRecord({ groupId: "test-group-id" })]),
      ),
    );

    const list = screen.getByTestId("expenses-list");
    await act(() => list.props.refreshControl.props.onRefresh());

    await waitFor(() => expect(screen.getByText("test expense title")));
  });
});
