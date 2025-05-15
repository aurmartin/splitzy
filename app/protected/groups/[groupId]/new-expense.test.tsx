import NewExpenseScreen from "@/app/protected/groups/[groupId]/new-expense";
import { tables } from "@/lib/db/schema";
import { setMe } from "@/lib/groups";
import { system } from "@/lib/test-setup";
import { buildGroupRecord, renderRouter } from "@/lib/test-utils";
import { screen, userEvent, waitFor } from "@testing-library/react-native";
import { eq } from "drizzle-orm";

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    assets: [
      {
        uri: "https://example.com/receipt.jpg",
      },
    ],
  }),
}));

jest.mock("expo-file-system", () => ({
  ...jest.requireActual("expo-file-system"),
  readAsStringAsync: jest.fn().mockResolvedValue(""),
}));

beforeEach(async () => {
  const group = buildGroupRecord({ id: "test-group-id" });
  await system.db.insert(tables.groups).values(group);
  setMe(system, group.id, "Alice");
});

const routerContext = {
  "/protected/groups/[groupId]/new-expense": () => <NewExpenseScreen />,
};

const newExpenseScreenUrl = "/protected/groups/test-group-id/new-expense";

describe("NewExpenseScreen", () => {
  it("should render correctly", () => {
    renderRouter(routerContext, system, { initialUrl: newExpenseScreenUrl });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("should create an expense", async () => {
    const user = userEvent.setup();

    renderRouter(routerContext, system, { initialUrl: newExpenseScreenUrl });

    await user.clear(screen.getByLabelText("Titre"));
    await user.type(screen.getByLabelText("Titre"), "Test expense");
    await user.type(screen.getAllByLabelText(/Montant/)[0], "100");
    await user.press(screen.getByRole("button", { name: /Alice/ }));
    await user.press(screen.getByLabelText("Enregistrer"));

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

    renderRouter(routerContext, system, { initialUrl: newExpenseScreenUrl });

    await user.clear(screen.getByLabelText("Titre"));
    await user.press(screen.getByLabelText("Enregistrer"));

    await screen.findByText("Veuillez entrer un titre");
  });

  it("should throw an error if the group is not found", () => {
    expect(() =>
      renderRouter(routerContext, system, {
        initialUrl: "/protected/groups/not-found/new-expense",
      }),
    ).toThrow("Group not found");
  });

  it("should handle receipt", async () => {
    const user = userEvent.setup();

    renderRouter(routerContext, system, { initialUrl: newExpenseScreenUrl });

    await user.press(
      screen.getByRole("button", { name: /Télécharger un reçu/ }),
    );

    await screen.findByDisplayValue("Test receipt");
  });
});
