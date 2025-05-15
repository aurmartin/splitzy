import { convertSplit } from "@/components/split-input";
import { getEffectiveAmounts } from "@/components/split-input/amount-split";
import { ExpensesRepository } from "@/lib/expenses/repository";
import { System } from "@/lib/system";
import { generateId } from "@/lib/utils";
import { ValidationError } from "@/lib/validation-error";
import dinero, { Dinero } from "dinero.js";
import {
  Expense,
  ExpenseCreateParams,
  ExpenseUpdateParams,
  Split,
} from "./types";
import { DisplayableError } from "../displayable-error";

const insertExpense = async (system: System, params: ExpenseCreateParams) => {
  const validParams = validateCreateExpenseParams(params);
  const expense = createExpense(validParams);
  await ExpensesRepository.insertExpense(system, expense);
};

const updateExpense = async (
  system: System,
  id: string,
  params: ExpenseUpdateParams,
) => {
  const expense = ExpensesRepository.getExpenseOrThrow(system, id);

  const validParams = validateUpdateExpenseParams(params);
  const updatedExpense = {
    ...expense,
    ...validParams,
    updatedAt: new Date(),
  };
  await ExpensesRepository.updateExpense(system, updatedExpense);
};

const deleteExpense = async (system: System, id: string) => {
  await ExpensesRepository.deleteExpense(system, id);
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

const validateCreateExpenseParams = (params: ExpenseCreateParams) => {
  if (params.title.length === 0) {
    throw new DisplayableError(
      "Le titre est invalide",
      "Veuillez entrer un titre",
    );
  }

  if (params.payerName.length === 0) {
    throw new DisplayableError(
      "Le membre est invalide",
      "Veuillez sélectionner un membre",
    );
  }

  const splitError = validateSplit(params.splitExpense);
  if (splitError) {
    throw new DisplayableError("Le partage est invalide", splitError);
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

export const ExpenseService = {
  insertExpense,
  updateExpense,
  deleteExpense,
  getAmounts,
};
