import type { Currency, Dinero } from "dinero.js";

interface BaseSplit {
  type: "percentage" | "amount" | "equal" | "receipt";
  total: Dinero;
  members: string[];
}

interface PercentageSplit extends BaseSplit {
  type: "percentage";
  ratios: { [member: string]: number };
}

interface EqualSplit extends BaseSplit {
  type: "equal";
}

interface AmountSplit extends BaseSplit {
  type: "amount";
  amounts: { [member: string]: Dinero };
}

interface ReceiptSplit extends BaseSplit {
  type: "receipt";
  receipt: Receipt;
}

type Split = PercentageSplit | EqualSplit | AmountSplit | ReceiptSplit;

interface Receipt {
  date: Date;
  total: Dinero;
  title: string;
  currency: Currency;

  items: {
    description: string;
    humanReadableDescription: string;
    price: Dinero;
    paid_for: string[];
  }[];
}

interface Expense {
  id: string;
  groupId: string;
  title: string;
  payerName: string;
  splitExpense: Split;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | undefined;

  receipt: Receipt | null;
}

interface ExpenseCreateParams {
  groupId: Expense["groupId"];
  title: Expense["title"];
  payerName: Expense["payerName"];
  splitExpense: Expense["splitExpense"];
  receipt: Expense["receipt"];
}

interface ExpenseUpdateParams {
  title: Expense["title"];
  payerName: Expense["payerName"];
  splitExpense: Expense["splitExpense"];
  receipt: Expense["receipt"];
}

export type {
  Expense,
  ExpenseCreateParams,
  ExpenseUpdateParams,
  Receipt,
  Split,
  PercentageSplit,
  EqualSplit,
  AmountSplit,
  ReceiptSplit,
};
