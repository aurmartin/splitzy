import NewExpenseScreen from "@/app/protected/groups/[groupId]/new-expense";
import { tables } from "@/lib/db/schema";
import { system } from "@/lib/test-setup";
import { createGroup } from "@/lib/test-factories";
import { renderRouter } from "@/lib/test-utils";
import { screen, userEvent, waitFor } from "@testing-library/react-native";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { eq } from "drizzle-orm";

const showActionSheetWithOptions = jest.fn();
jest.mocked(useActionSheet).mockReturnValue({
  showActionSheetWithOptions,
});

beforeEach(() => {
  createGroup(system, { id: "test-group-id" }, { me: "Alice" });
});

const routerContext = {
  "/protected/groups/[groupId]/new-expense": () => <NewExpenseScreen />,
};

const newExpenseScreenUrl = "/protected/groups/test-group-id/new-expense";

describe("NewExpenseScreen", () => {
  it("should render correctly", async () => {
    await renderRouter(routerContext, system, {
      initialUrl: newExpenseScreenUrl,
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("should create an expense", async () => {
    const user = userEvent.setup();

    await renderRouter(routerContext, system, {
      initialUrl: newExpenseScreenUrl,
    });

    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Test expense");
    await user.type(screen.getAllByLabelText(/Amount/)[0], "100");
    await user.press(screen.getByRole("button", { name: /Alice/ }));
    await user.press(screen.getByLabelText("Save"));

    await waitFor(async () => {
      const expenses = await system.db
        .select()
        .from(tables.expenses)
        .where(eq(tables.expenses.groupId, "test-group-id"));

      expect(expenses).toHaveLength(1);
      expect(expenses[0].title).toBe("Test expense");
      expect(expenses[0].payerName).toBe("Alice");
    });
  });

  it("should show validation errors if the form is invalid", async () => {
    const user = userEvent.setup();

    await renderRouter(routerContext, system, {
      initialUrl: newExpenseScreenUrl,
    });

    await user.clear(screen.getByLabelText("Title"));
    await user.press(screen.getByLabelText("Save"));

    await screen.findByText("Please enter a title");
  });

  it("should throw an error if the group is not found", async () => {
    await expect(
      renderRouter(routerContext, system, {
        initialUrl: "/protected/groups/not-found/new-expense",
      }),
    ).rejects.toThrow("Group not found");
  });

  it("should handle receipt", async () => {
    const user = userEvent.setup();

    // actionIndex = 1 => "Choose a photo"
    showActionSheetWithOptions.mockImplementation((_, callback) => callback(1));

    await renderRouter(routerContext, system, {
      initialUrl: newExpenseScreenUrl,
    });

    await user.press(screen.getByRole("button", { name: /Upload a receipt/ }));

    await screen.findByDisplayValue("Test receipt");
  });
});
