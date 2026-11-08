import BalanceScreen from "@/app/protected/groups/[groupId]/balance";
import { ExpensesRepository, ReimbursementService } from "@/lib/expenses";
import { Money } from "@/lib/money";
import { system } from "@/lib/test-setup";
import { buildEqualSplit, buildGroup, createExpense, createGroup } from "@/lib/test-factories";
import { renderRouter } from "@/lib/test-utils";
import { screen, userEvent } from "@testing-library/react-native";
import { Alert, type AlertButton, Text } from "react-native";

const group = buildGroup({ currency: "EUR", members: ["Alice", "Bob"] });
const groupId = group.id;

const alert = jest.spyOn(Alert, "alert");

// Answers the confirmation dialog by pressing the button with this text.
const answerAlert = (buttonText: string) =>
  alert.mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.text === buttonText)?.onPress?.();
  });

const groupReimbursements = () =>
  ExpensesRepository.getGroupExpenses(system, groupId).filter((expense) => expense.kind === "reimbursement");

// Only reset this spy: restoring every mock would also undo the Supabase
// connector mocks, which are spies too.
afterEach(() => {
  alert.mockReset();
});

beforeEach(() => {
  createGroup(system, group, { me: "Alice" });

  // Alice paid 20 € for Alice and Bob: Bob owes Alice 10 €.
  createExpense(system, group, {
    payerName: "Alice",
    splitExpense: buildEqualSplit(group, 2000),
  });
});

const routerContext = {
  "/protected/groups/[groupId]/index": () => <Text>Group screen</Text>,
  "/protected/groups/[groupId]/balance": () => <BalanceScreen />,
  "/protected/groups/[groupId]/expenses/[expenseId]": () => <Text>Expense screen</Text>,
};

const renderBalance = () =>
  renderRouter(routerContext, system, {
    initialUrl: `/protected/groups/${groupId}/balance`,
  });

describe("BalanceScreen", () => {
  it("records the suggested reimbursement once confirmed", async () => {
    const alert = answerAlert("Confirm");
    const user = userEvent.setup();
    await renderBalance();

    await user.press(screen.getByLabelText("Mark as settled"));

    expect(alert).toHaveBeenCalledWith(
      "Mark as settled?",
      expect.stringMatching(/^Bob paid .+ back to Alice\.$/),
      expect.any(Array),
      expect.anything(),
    );

    await screen.findByText("Group screen");

    const [reimbursement] = groupReimbursements();
    expect(reimbursement.payerName).toBe("Bob");
    expect(reimbursement.splitExpense.members).toEqual(["Alice"]);
    expect(reimbursement.splitExpense.total).toEqual(Money.create({ amount: 1000, currency: "EUR" }));
  });

  it("records nothing when the confirmation is cancelled", async () => {
    answerAlert("Cancel");
    const user = userEvent.setup();
    await renderBalance();

    await user.press(screen.getByLabelText("Mark as settled"));

    expect(groupReimbursements()).toEqual([]);
    screen.getByLabelText("Mark as settled");
  });

  it("lists recent reimbursements once everyone is settled", async () => {
    await ReimbursementService.insertReimbursement(system, {
      groupId,
      from: "Bob",
      to: "Alice",
      amount: Money.create({ amount: 1000, currency: "EUR" }),
    });

    await renderBalance();

    screen.getByText("Everyone is settled up!");
    screen.getByText("Recent reimbursements");
    screen.getByText(/paid back/);
  });
});
