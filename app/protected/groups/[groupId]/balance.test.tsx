import BalanceScreen from "@/app/protected/groups/[groupId]/balance";
import { tables } from "@/lib/db/schema";
import { ExpensesRepository, ReimbursementService } from "@/lib/expenses";
import { setMe } from "@/lib/groups";
import { Money } from "@/lib/money";
import { system } from "@/lib/test-setup";
import {
  buildExpenseRecord,
  buildGroupRecord,
  renderRouter,
} from "@/lib/test-utils";
import { screen, userEvent } from "@testing-library/react-native";
import { Alert, type AlertButton, Text } from "react-native";

const groupId = "test-group-id";

const alert = jest.spyOn(Alert, "alert");

// Answers the confirmation dialog by pressing the button with this text.
const answerAlert = (buttonText: string) =>
  alert.mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.text === buttonText)?.onPress?.();
  });

const groupReimbursements = () =>
  ExpensesRepository.getGroupExpenses(system, groupId).filter(
    (expense) => expense.kind === "reimbursement",
  );

// Only reset this spy: restoring every mock would also undo the Supabase
// connector mocks, which are spies too.
afterEach(() => {
  alert.mockReset();
});

beforeEach(async () => {
  await system.db
    .insert(tables.groups)
    .values(buildGroupRecord({ id: groupId, currency: "EUR" }));
  setMe(system, groupId, "Alice");

  // Alice paid 20 € for Alice and Bob: Bob owes Alice 10 €.
  await system.db.insert(tables.expenses).values(
    buildExpenseRecord({
      groupId,
      splitExpense: JSON.stringify({
        type: "equal",
        total: Money.create({ amount: 2000, currency: "EUR" }),
        members: ["Alice", "Bob"],
      }),
    }),
  );
});

const routerContext = {
  "/protected/groups/[groupId]/index": () => <Text>Group screen</Text>,
  "/protected/groups/[groupId]/balance": () => <BalanceScreen />,
  "/protected/groups/[groupId]/expenses/[expenseId]": () => (
    <Text>Expense screen</Text>
  ),
};

const renderBalance = () =>
  renderRouter(routerContext, system, {
    initialUrl: `/protected/groups/${groupId}/balance`,
  });

describe("BalanceScreen", () => {
  it("records the suggested reimbursement once confirmed", async () => {
    const alert = answerAlert("Confirmer");
    const user = userEvent.setup();
    await renderBalance();

    await user.press(screen.getByLabelText("Marquer comme réglé"));

    expect(alert).toHaveBeenCalledWith(
      "Marquer comme réglé ?",
      expect.stringMatching(/^Bob a remboursé .+ à Alice\.$/),
      expect.any(Array),
      expect.anything(),
    );

    await screen.findByText("Group screen");

    const [reimbursement] = groupReimbursements();
    expect(reimbursement.payerName).toBe("Bob");
    expect(reimbursement.splitExpense.members).toEqual(["Alice"]);
    expect(reimbursement.splitExpense.total).toEqual(
      Money.create({ amount: 1000, currency: "EUR" }),
    );
  });

  it("records nothing when the confirmation is cancelled", async () => {
    answerAlert("Annuler");
    const user = userEvent.setup();
    await renderBalance();

    await user.press(screen.getByLabelText("Marquer comme réglé"));

    expect(groupReimbursements()).toEqual([]);
    screen.getByLabelText("Marquer comme réglé");
  });

  it("lists recent reimbursements once everyone is settled", async () => {
    await ReimbursementService.insertReimbursement(system, {
      groupId,
      from: "Bob",
      to: "Alice",
      amount: Money.create({ amount: 1000, currency: "EUR" }),
    });

    await renderBalance();

    screen.getByText("Tout le monde est à jour !");
    screen.getByText("Derniers remboursements");
    screen.getByText(/a remboursé/);
  });
});
