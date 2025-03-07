import { useSystem } from "@/components/system-provider";
import { expensesTable, type ExpenseRecord } from "@/lib/db/schema";
import { Receipt, type Expense, type Split } from "@/lib/expenses";
import { System } from "@/lib/system";
import dinero, { type Currency, type Dinero } from "dinero.js";
import { desc, eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

type DineroRecord = {
  amount: number;
  currency: Currency;
  precision: number;
};

const getExpense = (system: System, id: string): Expense | null => {
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
};

const insertExpense = async (system: System, expense: Expense) => {
  const row = encodeExpense(expense);
  await system.syncEngine.insert(expensesTable, expense.id, row);
};

const updateExpense = async (system: System, expense: Expense) => {
  const row = encodeExpense(expense);
  await system.syncEngine.update(expensesTable, expense.id, row);
};

const deleteExpense = async (system: System, id: string) => {
  await system.syncEngine.delete(expensesTable, id);
};

const useExpenses = (groupId: string) => {
  const system = useSystem();
  const { data } = useLiveQuery(
    system.db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.groupId, groupId))
      .orderBy(desc(expensesTable.createdAt)),
  );

  return data.map(decodeExpenseRecord);
};

const useExpense = (id: string): Expense | null => {
  const system = useSystem();
  const { data } = useLiveQuery(
    system.db.select().from(expensesTable).where(eq(expensesTable.id, id)),
  );

  if (data.length === 0) {
    return null;
  }

  return decodeExpenseRecord(data[0]);
};

const decodeExpenseRecord = (record: ExpenseRecord): Expense => {
  return {
    id: record.id,
    groupId: record.groupId as string,
    title: record.title as string,
    payerName: record.payerName as string,
    splitExpense: decodeSplitExpense(record.splitExpense as string),
    receipt: decodeReceipt(record.receipt as string),
    createdAt: new Date(record.createdAt as string),
    updatedAt: new Date(record.updatedAt as string),
    deletedAt: record.deletedAt
      ? new Date(record.deletedAt as string)
      : undefined,
  };
};

const decodeSplitExpense = (encoded: string): Expense["splitExpense"] => {
  const decoded = JSON.parse(encoded);

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
      return { type, total, members, receipt: decoded.receipt };
  }
};

const decodeReceipt = (encoded: string): Receipt | null => {
  const decoded = JSON.parse(encoded) as {
    date: string;
    total: DineroRecord;
    title: string;
    currency: Currency;
    items: {
      description: string;
      humanReadableDescription: string;
      price: DineroRecord;
      paid_for: string[];
    }[];
  } | null;

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
    items: decoded.items.map((item) => ({
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
};

const encodeExpense = (expense: Expense): ExpenseRecord => {
  return {
    ...expense,
    splitExpense: JSON.stringify(expense.splitExpense),
    receipt: expense.receipt ? JSON.stringify(expense.receipt) : null,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    deletedAt: expense.deletedAt?.toISOString() ?? null,
  };
};

export const ExpensesRepository = {
  getExpense,
  insertExpense,
  updateExpense,
  deleteExpense,

  useExpenses,
  useExpense,
};
