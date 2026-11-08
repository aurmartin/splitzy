import { DisplayableError } from "@/lib/displayable-error";
import { i18n } from "@/lib/i18n";
import { ExpensesRepository } from "@/lib/expenses/repository";
import { Money } from "@/lib/money";
import { System } from "@/lib/system";
import { generateId } from "@/lib/utils";
import type { AmountSplit, Expense } from "./types";

type ReimbursementParams = {
  groupId: string;
  from: string;
  to: string;
  amount: Money;
};

// A reimbursement cannot be edited once recorded: to fix one, delete it.
type Reimbursement = Expense & {
  kind: "reimbursement";
  splitExpense: AmountSplit;
};

const isReimbursement = (expense: Expense): expense is Reimbursement => expense.kind === "reimbursement";

// The member who received the money: a reimbursement is an expense paid by
// "from" and entirely attributed to "to".
const getRecipient = (reimbursement: Reimbursement): string => reimbursement.splitExpense.members[0];

const validate = (params: ReimbursementParams) => {
  if (params.from.length === 0 || params.to.length === 0) {
    throw new DisplayableError(i18n.t("validation.invalidMember"), i18n.t("validation.selectTwoMembers"));
  }

  if (params.from === params.to) {
    throw new DisplayableError(i18n.t("validation.invalidMembers"), i18n.t("validation.chooseDifferentMembers"));
  }

  if (params.amount.amount <= 0) {
    throw new DisplayableError(i18n.t("validation.invalidAmount"), i18n.t("validation.enterAmount"));
  }
};

const insertReimbursement = async (system: System, params: ReimbursementParams): Promise<Reimbursement> => {
  validate(params);

  const now = new Date();
  const reimbursement: Reimbursement = {
    id: generateId(),
    groupId: params.groupId,
    kind: "reimbursement",
    title: "Remboursement",
    payerName: params.from,
    splitExpense: {
      type: "amount",
      total: params.amount,
      members: [params.to],
      amounts: { [params.to]: params.amount },
    },
    receipt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: undefined,
  };

  await ExpensesRepository.insertExpense(system, reimbursement);

  return reimbursement;
};

export const ReimbursementService = {
  insertReimbursement,
  isReimbursement,
  getRecipient,
};

export type { Reimbursement, ReimbursementParams };
