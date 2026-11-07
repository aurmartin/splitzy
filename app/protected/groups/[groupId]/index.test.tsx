import GroupScreen from "@/app/protected/groups/[groupId]/index";
import { tables } from "@/lib/db/schema";
import { encodeGroup, removeMe, setMe } from "@/lib/groups";
import { system } from "@/lib/test-setup";
import { buildExpenseRecord, buildGroup, createExpense, createGroup } from "@/lib/test-factories";
import { renderRouter } from "@/lib/test-utils";
import { act, fireEvent, screen, userEvent } from "@testing-library/react-native";
import { eq } from "drizzle-orm";
import { Share, Text } from "react-native";

const share = jest.spyOn(Share, "share").mockResolvedValue({
  action: "sharedAction",
  activityType: undefined,
});

const group = buildGroup({ id: "test-group-id" });

beforeEach(() => {
  createGroup(system, group, { me: "Alice" });
});

const routerContext = {
  "/protected/index": () => <Text>Group list</Text>,
  "/protected/groups/[groupId]/settings": () => <Text>Settings</Text>,
  "/protected/groups/[groupId]/index": () => <GroupScreen />,
  "/protected/groups/[groupId]/set-me": () => <Text>Set me</Text>,
  "/protected/groups/[groupId]/new-expense": () => <Text>New expense</Text>,
  "/protected/groups/[groupId]/balance": () => <Text>Balance</Text>,
  "/protected/groups/[groupId]/expenses/[expenseId]": () => <Text>Expense</Text>,
};

const testGroupScreenUrl = "/protected/groups/test-group-id";

describe("GroupScreen", () => {
  it("should render correctly", async () => {
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });
    expect(screen.toJSON()).toMatchSnapshot();
    screen.getByText(group.name);
  });

  it("should redirect to set-me if me is not set", async () => {
    removeMe(system, "test-group-id");
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });
    screen.getByText("Set me");
  });

  it("should redirect to set-me if me was removed from the members", async () => {
    setMe(system, "test-group-id", "Charlie");
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });
    screen.getByText("Set me");
  });

  it("should redirect to the group list if group is not found", async () => {
    await renderRouter(routerContext, system, {
      initialUrl: "/protected/groups/not-found",
    });
    screen.getByText("Group list");
  });

  it("should redirect to the group list if group is deleted", async () => {
    await system.db
      .update(tables.groups)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(tables.groups.id, "test-group-id"));
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });
    screen.getByText("Group list");
  });

  it("should navigate to the group settings", async () => {
    const user = userEvent.setup();
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });
    await user.press(screen.getByLabelText("Paramètres du groupe"));
    screen.getByText("Settings");
  });

  it("should show the new group name after a rename", async () => {
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });

    await act(() =>
      system.syncEngine.update(tables.groups, "test-group-id", {
        name: "renamed group",
      }),
    );

    screen.getByText("renamed group");
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
    const expense = createExpense(system, group, { createdAt: new Date() });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    createExpense(system, group, { createdAt: yesterday });

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    createExpense(system, group, { createdAt: twoDaysAgo });

    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });

    screen.getAllByText(expense.title);
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
    const expense = createExpense(system, group);
    await renderRouter(routerContext, system, {
      initialUrl: testGroupScreenUrl,
    });

    await user.press(screen.getByText(expense.title));

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

    const expense = buildExpenseRecord(group);
    // Groups are synced first, then expenses.
    (system.supabaseConnector.selectAll as jest.Mock)
      .mockResolvedValueOnce({ data: [encodeGroup(group)], error: null })
      .mockResolvedValueOnce({ data: [expense], error: null });

    await fireEvent(screen.getByTestId("expenses-list"), "onRefresh");

    await screen.findByText(expense.title);
  });
});
