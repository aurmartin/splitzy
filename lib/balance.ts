import dinero, { type Dinero } from "dinero.js";
import { type Expense, ExpenseService, useExpenses } from "@/lib/expenses";
import { type Group } from "@/lib/groups";

export type Balance = Record<string, Dinero>;

export type Reimbursement = {
  from: string;
  to: string;
  amount: Dinero;
};

export function computeBalance(group: Group, expenses: Expense[]): Balance {
  const balance = group.members.reduce((acc, member) => {
    acc[member] = dinero({ amount: 0, currency: group.currency });
    return acc;
  }, {} as Balance);

  expenses.forEach((expense) => {
    const payer = expense.payerName;
    const total = expense.splitExpense.total;

    balance[payer] = balance[payer].add(total);

    const amounts = ExpenseService.getAmounts(expense);

    Object.entries(amounts).forEach(([name, amount]) => {
      balance[name] = balance[name].subtract(amount);
    });
  });

  return balance;
}

export const useBalance = (group: Group): Balance => {
  const expenses = useExpenses(group.id);
  return computeBalance(group, expenses);
};

export function computeOptimalReimbursements(
  balance: Balance,
): Reimbursement[] {
  const reimbursements: Reimbursement[] = [];
  const members = Object.keys(balance);

  // Create a copy of the balance object
  const workingBalance = members.reduce((acc, member) => {
    acc[member] = balance[member];
    return acc;
  }, {} as Balance);

  // Continue while there are non-zero balances
  while (members.some((member) => !workingBalance[member].isZero())) {
    // Find the person who owes the most (most negative balance)
    const maxDebtor = members.reduce((a, b) =>
      workingBalance[a].lessThan(workingBalance[b]) ? a : b,
    );

    // Find the person who is owed the most (most positive balance)
    const maxCreditor = members.reduce((a, b) =>
      workingBalance[a].greaterThan(workingBalance[b]) ? a : b,
    );

    // If both balances are effectively zero (less than 1 cent), break
    if (
      workingBalance[maxDebtor].isZero() &&
      workingBalance[maxCreditor].isZero()
    ) {
      break;
    }

    // Calculate the reimbursement amount (minimum of absolute values)
    const debtorAmount = workingBalance[maxDebtor].multiply(-1); // Make positive
    const creditorAmount = workingBalance[maxCreditor];
    const amount = debtorAmount.lessThan(creditorAmount)
      ? debtorAmount
      : creditorAmount;

    // Update the balances
    workingBalance[maxDebtor] = workingBalance[maxDebtor].add(amount);
    workingBalance[maxCreditor] = workingBalance[maxCreditor].subtract(amount);

    // Record the reimbursement
    reimbursements.push({
      from: maxDebtor,
      to: maxCreditor,
      amount,
    });
  }

  return reimbursements;
}
