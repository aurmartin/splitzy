import NewExpenseScreen from "@/app/protected/groups/[groupId]/new-expense";
import { tables } from "@/lib/db/schema";
import { setMe } from "@/lib/groups";
import { system } from "@/lib/test-setup";
import {
  buildGroupRecord,
  renderRouter,
  setFakeSession,
} from "@/lib/test-utils";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
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
    renderRouter(routerContext, system, { initialUrl: newExpenseScreenUrl });

    fireEvent.changeText(screen.getByText("Titre"), "Test expense");
    fireEvent.changeText(screen.getByText(/Montant/), "100");
    fireEvent.changeText(screen.getByText("Payé par"), "Alice");
    fireEvent.press(screen.getByText("Créer la dépense"));

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
    renderRouter(routerContext, system, { initialUrl: newExpenseScreenUrl });

    fireEvent.changeText(screen.getByText("Titre"), "");
    fireEvent.press(screen.getByText("Créer la dépense"));

    await waitFor(() => expect(screen.getByText("Veuillez entrer un titre")));
  });

  it("should throw an error if the group is not found", () => {
    expect(() =>
      renderRouter(routerContext, system, {
        initialUrl: "/protected/groups/not-found/new-expense",
      }),
    ).toThrow("Group not found");
  });

  it("should handle receipt", async () => {
    setFakeSession(system);

    renderRouter(routerContext, system, { initialUrl: newExpenseScreenUrl });

    fireEvent.press(screen.getByText("Télécharger un reçu"));

    await waitFor(() => {
      const input = screen.getByPlaceholderText("Titre");
      expect(input.props.value).toBe("Test receipt");
    });
  });
});
