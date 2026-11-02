import GroupScreen from "@/app/protected/groups/[groupId]/index";
import { tables } from "@/lib/db/schema";
import { removeMe, setMe } from "@/lib/groups";
import { system } from "@/lib/test-setup";
import {
  buildExpenseRecord,
  buildGroupRecord,
  renderRouter,
} from "@/lib/test-utils";
import { fireEvent, screen, userEvent } from "@testing-library/react-native";
import { Share, Text } from "react-native";

const share = jest.spyOn(Share, "share").mockResolvedValue({
  action: "sharedAction",
  activityType: undefined,
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
  it("should render correctly", async () => {
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });
    expect(screen.toJSON()).toMatchSnapshot();
    screen.getByText("test group name");
  });

  it("should redirect to set-me if me is not set", async () => {
    removeMe(system, "test-group-id");
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });
    screen.getByText("Set me");
  });

  it("should throw if group is not found", async () => {
    await expect(
      renderRouter(routerContext, system, {
        initialUrl: "/protected/groups/not-found",
      }),
    ).rejects.toThrow("Group not found");
  });

  it("should share the group", async () => {
    const user = userEvent.setup();
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });
    await user.press(screen.getByLabelText("Partager"));
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

    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });

    screen.getAllByText("test expense title");
    screen.getAllByText(/Alice/);
    screen.getByText("Aujourd'hui");
    screen.getByText("Hier");
    screen.getByText(
      twoDaysAgo.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );
  });

  it("should navigate to new expense", async () => {
    const user = userEvent.setup();
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });
    await user.press(screen.getByTestId("fab-button"));
    screen.getByText("New expense");
  });

  it("should navigate to expense", async () => {
    const user = userEvent.setup();
    await system.db
      .insert(tables.expenses)
      .values(buildExpenseRecord({ groupId: "test-group-id" }));
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });

    await user.press(screen.getByText("test expense title"));

    screen.getByText("Expense");
  });

  it("should navigate to balance", async () => {
    const user = userEvent.setup();
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });

    await user.press(screen.getByText("Remboursements"));

    screen.getByText("Balance");
  });

  it("should refresh expenses", async () => {
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });
    screen.getByText("Aucune dépense");

    (system.supabaseConnector.selectAll as jest.Mock).mockResolvedValueOnce({
      data: [buildExpenseRecord({ groupId: "test-group-id" })],
      error: null,
    });

    await fireEvent(screen.getByTestId("expenses-list"), "onRefresh");

    await screen.findByText("test expense title");
  });
});
