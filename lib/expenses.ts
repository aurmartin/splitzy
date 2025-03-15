import { convertSplit } from "@/components/split-input";
import { useSystem } from "@/components/system-provider";
import { ValidationError } from "@/lib/validation-error";
import { ExpensesRepository } from "@/lib/expenses-repository";
import { System } from "@/lib/system";
import { generateId } from "@/lib/utils";
import dinero, { Currency, Dinero } from "dinero.js";
import { useCallback, useMemo } from "react";
import { getEffectiveAmounts } from "@/components/split-input/amount-split";

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

const useAddExpense = () => {
  const system = useSystem();

  return useCallback(
    (params: ExpenseCreateParams) => addExpense(system, params),
    [system],
  );
};

const useEditExpense = () => {
  const system = useSystem();
  return useCallback(
    (id: string, params: ExpenseUpdateParams) =>
      editExpense(system, id, params),
    [system],
  );
};

const useDelExpense = () => {
  const system = useSystem();
  return useCallback(
    (id: string) => ExpensesRepository.deleteExpense(system, id),
    [system],
  );
};

const addExpense = async (system: System, params: ExpenseCreateParams) => {
  const validParams = validateCreateExpenseParams(params);
  const expense = createExpense(validParams);
  await ExpensesRepository.insertExpense(system, expense);
};

const editExpense = async (
  system: System,
  id: string,
  params: ExpenseUpdateParams,
) => {
  const expense = ExpensesRepository.getExpense(system, id);
  if (expense === null) {
    throw new Error("Expense not found");
  }

  const validParams = validateUpdateExpenseParams(params);
  const updatedExpense = modifyExpense(expense, validParams);
  await ExpensesRepository.updateExpense(system, updatedExpense);
};

const createExpense = (validParams: ExpenseCreateParams): Expense => {
  return {
    ...validParams,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
  };
};

const modifyExpense = (
  expense: Expense,
  params: ExpenseUpdateParams,
): Expense => {
  return {
    ...expense,
    ...params,
    updatedAt: new Date(),
  };
};

const validateCreateExpenseParams = (params: ExpenseCreateParams) => {
  const errors: Record<string, string> = {};

  if (params.title.length === 0) {
    errors.title = "Veuillez entrer un titre";
  }

  if (params.payerName.length === 0) {
    errors.payerName = "Veuillez sélectionner un membre";
  }

  const splitError = validateSplit(params.splitExpense);
  if (splitError) {
    errors.splitExpense = splitError;
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  return params;
};

const validateUpdateExpenseParams = (params: ExpenseUpdateParams) => {
  const errors: Record<string, string> = {};

  if (params.title.length === 0) {
    errors.title = "Veuillez entrer un titre";
  }

  if (params.payerName.length === 0) {
    errors.payerName = "Veuillez sélectionner un membre";
  }

  const splitError = validateSplit(params.splitExpense);
  if (splitError) {
    errors.splitExpense = splitError;
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  return params;
};

const validateSplit = (split: Split): string | undefined => {
  if (split.type === "amount") {
    const effectiveAmounts = getEffectiveAmounts(split);

    const total = Object.values(effectiveAmounts).reduce(
      (acc, curr) => acc.add(curr),
      dinero({ amount: 0, currency: split.total.getCurrency() }),
    );

    if (total.getAmount() !== split.total.getAmount()) {
      return "La somme des montants ne correspond pas au total";
    }
  }
};

const getAmounts = (expense: Expense): Record<string, Dinero> => {
  const amountSplit = convertSplit(expense.splitExpense);
  return getEffectiveAmounts(amountSplit);
};

const useAmounts = (expense: Expense) => {
  return useMemo(() => getAmounts(expense), [expense]);
};

const useExpense = ExpensesRepository.useExpense;
const useExpenses = ExpensesRepository.useExpenses;

export type {
  AmountSplit,
  EqualSplit,
  Expense,
  PercentageSplit,
  Receipt,
  ReceiptSplit,
  Split,
};

export {
  addExpense,
  getAmounts,
  useAmounts,
  useAddExpense,
  useDelExpense,
  useEditExpense,
  useExpense,
  useExpenses,
};
