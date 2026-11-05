import { computeBalance, computeOptimalReimbursements } from "@/lib/balance";
import { DisplayableError } from "@/lib/displayable-error";
import {
  ExpenseService,
  ExpensesRepository,
  ReimbursementService,
} from "@/lib/expenses";
import { type Group } from "@/lib/groups";
import { Money } from "@/lib/money";
import { system } from "@/lib/test-setup";

const eur = (amount: number) => Money.create({ amount, currency: "EUR" });

const group = {
  id: "group-id",
  name: "Trip",
  currency: "EUR",
  members: ["Alice", "Bob", "Charlie"],
} as Group;

const insertDinner = () =>
  ExpenseService.insertExpense(system, {
    groupId: group.id,
    title: "Dinner",
    payerName: "Alice",
    splitExpense: {
      type: "equal",
      total: eur(3000),
      members: ["Alice", "Bob", "Charlie"],
    },
    receipt: null,
  });

const groupExpenses = () =>
  ExpensesRepository.getGroupExpenses(system, group.id);

describe("ReimbursementService", () => {
  it("stores a reimbursement as an amount split attributed to the recipient", async () => {
    const created = await ReimbursementService.insertReimbursement(system, {
      groupId: group.id,
      from: "Bob",
      to: "Alice",
      amount: eur(1000),
    });

    const stored = ExpensesRepository.getExpenseOrThrow(system, created.id);

    expect(stored.kind).toBe("reimbursement");
    expect(stored.title).toBe("Remboursement");
    expect(stored.payerName).toBe("Bob");
    expect(stored.splitExpense).toEqual({
      type: "amount",
      total: eur(1000),
      members: ["Alice"],
      amounts: { Alice: eur(1000) },
    });
    expect(ReimbursementService.isReimbursement(stored)).toBe(true);
  });

  it("keeps plain expenses as kind expense", async () => {
    await insertDinner();

    expect(groupExpenses()[0].kind).toBe("expense");
    expect(ReimbursementService.isReimbursement(groupExpenses()[0])).toBe(
      false,
    );
  });

  it("settles every suggested reimbursement down to a zero balance", async () => {
    await insertDinner();

    const suggestions = computeOptimalReimbursements(
      computeBalance(group, groupExpenses()),
    );
    expect(suggestions).toHaveLength(2);

    for (const suggestion of suggestions) {
      await ReimbursementService.insertReimbursement(system, {
        groupId: group.id,
        ...suggestion,
      });
    }

    const balance = computeBalance(group, groupExpenses());
    expect(Object.values(balance).every(Money.isZero)).toBe(true);
    expect(computeOptimalReimbursements(balance)).toEqual([]);
  });

  it("rejects the same member on both sides", async () => {
    await expect(
      ReimbursementService.insertReimbursement(system, {
        groupId: group.id,
        from: "Bob",
        to: "Bob",
        amount: eur(1000),
      }),
    ).rejects.toThrow(DisplayableError);
  });

  it("rejects a zero amount", async () => {
    await expect(
      ReimbursementService.insertReimbursement(system, {
        groupId: group.id,
        from: "Bob",
        to: "Alice",
        amount: eur(0),
      }),
    ).rejects.toThrow("Veuillez entrer un montant");
  });
});
