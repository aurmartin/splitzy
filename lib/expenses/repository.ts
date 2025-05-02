import { expensesTable, type ExpenseRecord } from "@/lib/db/schema";
import { System } from "@/lib/system";
import dinero, { type Currency, type Dinero } from "dinero.js";
import { desc, eq } from "drizzle-orm";

import type { Expense, Receipt, Split } from "./types";

interface DineroRecord {
  amount: number;
  currency: Currency;
  precision: number;
}

function getExpense(system: System, id: string): Expense | null {
  const rows = system.db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.id, id))
    .limit(1)
    .all();

  if (rows.length === 0) {
    return null;
  }

  return decodeExpenseRecord(rows[0]);
}

function getExpenseOrThrow(system: System, id: string): Expense {
  const expense = getExpense(system, id);
  if (expense === null) {
    throw new Error("Expense not found");
  }
  return expense;
}

async function insertExpense(system: System, expense: Expense): Promise<void> {
  const row = encodeExpense(expense);
  await system.syncEngine.insert(expensesTable, expense.id, row);
}

async function updateExpense(system: System, expense: Expense): Promise<void> {
  const row = encodeExpense(expense);
  await system.syncEngine.update(expensesTable, expense.id, row);
}

async function deleteExpense(system: System, id: string): Promise<void> {
  await system.syncEngine.delete(expensesTable, id);
}

function getGroupExpenses(system: System, groupId: string): Expense[] {
  const expenses = system.db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.groupId, groupId))
    .orderBy(desc(expensesTable.createdAt))
    .all();

  return expenses.map(decodeExpenseRecord);
}

function watchGroupExpenses(
  system: System,
  groupId: string,
  callback: (expenses: Expense[]) => void,
): () => void {
  return system.syncEngine.watchTable(expensesTable, () => {
    callback(getGroupExpenses(system, groupId));
  });
}

function watchExpense(
  system: System,
  id: string,
  callback: (expense: Expense) => void,
): () => void {
  return system.syncEngine.watchTable(expensesTable, () => {
    const expense = getExpense(system, id);

    if (expense) {
      callback(expense);
    }
  });
}

function decodeExpenseRecord(record: ExpenseRecord): Expense {
  const decodedReceipt = decodeReceipt(JSON.parse(record.receipt as string));
  const decodedSplitExpense = decodeSplitExpense(
    JSON.parse(record.splitExpense as string),
  );

  return {
    id: record.id,
    groupId: record.groupId as string,
    title: record.title as string,
    payerName: record.payerName as string,
    splitExpense: decodedSplitExpense,
    receipt: decodedReceipt,
    createdAt: new Date(record.createdAt as string),
    updatedAt: new Date(record.updatedAt as string),
    deletedAt: record.deletedAt
      ? new Date(record.deletedAt as string)
      : undefined,
  };
}

function decodeSplitExpense(decoded: any): Expense["splitExpense"] {
  const total = dinero({
    amount: decoded.total.amount,
    currency: decoded.total.currency,
    precision: decoded.total.precision,
  });

  const members = decoded.members as string[];
  const type = decoded.type as Split["type"];

  switch (type) {
    case "percentage":
      return { type, total, members, ratios: decoded.ratios };
    case "equal":
      return { type, total, members };
    case "amount":
      const amounts = decoded.amounts as Record<string, DineroRecord>;
      return {
        type,
        total,
        members,
        amounts: Object.entries(amounts).reduce(
          (acc, [member, amount]) => {
            acc[member] = dinero({
              amount: amount.amount,
              currency: amount.currency,
              precision: amount.precision,
            });

            return acc;
          },
          {} as { [member: string]: Dinero },
        ),
      };
    case "receipt":
      return {
        type,
        total,
        members,
        receipt: decodeReceipt(decoded.receipt)!,
      };
  }
}

function decodeReceipt(decoded: any): Receipt | null {
  if (decoded === null) {
    return null;
  }

  return {
    title: decoded.title,
    currency: decoded.currency,
    date: new Date(decoded.date),
    total: dinero({
      amount: decoded.total.amount,
      currency: decoded.total.currency,
      precision: decoded.total.precision,
    }),
    items: decoded.items.map((item: any) => ({
      description: item.description,
      humanReadableDescription: item.humanReadableDescription,
      price: dinero({
        amount: item.price.amount,
        currency: item.price.currency,
        precision: item.price.precision,
      }),
      paid_for: item.paid_for,
    })),
  };
}

function encodeExpense(expense: Expense): ExpenseRecord {
  return {
    ...expense,
    splitExpense: JSON.stringify(expense.splitExpense),
    receipt: expense.receipt ? JSON.stringify(expense.receipt) : null,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    deletedAt: expense.deletedAt?.toISOString() ?? null,
  };
}

export const ExpensesRepository = {
  getExpense,
  watchExpense,
  getExpenseOrThrow,
  insertExpense,
  updateExpense,
  deleteExpense,

  getGroupExpenses,
  watchGroupExpenses,
};
