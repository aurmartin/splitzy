import { expensesTable, groupsTable } from "@/lib/db/schema";
import type { AmountSplit, EqualSplit, Expense, PercentageSplit, Receipt } from "@/lib/expenses";
import { encodeExpense } from "@/lib/expenses/repository";
import { encodeGroup, setMe, type Group } from "@/lib/groups";
import { Money } from "@/lib/money";
import type { System } from "@/lib/system";
import { generateId } from "@/lib/utils";

const BASE_DATE = Date.parse("2026-01-01T12:00:00.000Z");
let sequence = 0;

const nextDate = () => new Date(BASE_DATE + ++sequence * 60_000);

const money = (group: Group, amount: number) => Money.create({ amount, currency: group.currency });

const buildGroup = (overrides: Partial<Group> = {}): Group => {
  const date = nextDate();

  return {
    id: generateId(),
    name: "Test group",
    currency: "EUR",
    members: ["Alice", "Bob"],
    createdAt: date,
    updatedAt: date,
    deletedAt: undefined,
    ...overrides,
  };
};

type Amounts = Record<string, number>;

const sum = (amounts: Amounts) => Object.values(amounts).reduce((a, b) => a + b, 0);

const toMoney = (group: Group, amounts: Amounts) =>
  Object.fromEntries(Object.entries(amounts).map(([member, amount]) => [member, money(group, amount)]));

const buildEqualSplit = (group: Group, total = 1000, members = group.members): EqualSplit => ({
  type: "equal",
  total: money(group, total),
  members,
});

const buildAmountSplit = (group: Group, amounts: Amounts, total = sum(amounts)): AmountSplit => ({
  type: "amount",
  total: money(group, total),
  members: group.members,
  amounts: toMoney(group, amounts),
});

const buildPercentageSplit = (group: Group, ratios: Amounts, total = 1000): PercentageSplit => ({
  type: "percentage",
  total: money(group, total),
  members: Object.keys(ratios),
  ratios,
});

const buildReceipt = (group: Group, overrides: Partial<Receipt> = {}): Receipt => {
  const [first, second] = group.members;
  const items: Receipt["items"] = [
    {
      description: "Main course",
      humanReadableDescription: "Main course",
      price: money(group, 2000),
      paid_for: [first, second],
    },
    {
      description: "Dessert",
      humanReadableDescription: "Dessert",
      price: money(group, 1000),
      paid_for: [first],
    },
  ];

  return {
    title: "Restaurant bill",
    date: new Date("2026-01-01"),
    items,
    total: money(group, 3000),
    ...overrides,
  };
};

const buildExpense = (group: Group, overrides: Partial<Expense> = {}): Expense => {
  const date = nextDate();

  return {
    id: generateId(),
    groupId: group.id,
    kind: "expense",
    title: "Test expense",
    payerName: group.members[0],
    splitExpense: buildEqualSplit(group),
    receipt: null,
    createdAt: date,
    updatedAt: date,
    deletedAt: undefined,
    ...overrides,
  };
};

const buildGroupRecord = (overrides: Partial<Group> = {}) => encodeGroup(buildGroup(overrides));

const buildExpenseRecord = (group: Group, overrides: Partial<Expense> = {}) =>
  encodeExpense(buildExpense(group, overrides));

const createGroup = (system: System, overrides: Partial<Group> = {}, { me }: { me?: string } = {}): Group => {
  const group = buildGroup(overrides);
  system.db.insert(groupsTable).values(encodeGroup(group)).run();

  if (me) {
    setMe(system, group.id, me);
  }

  return group;
};

const createExpense = (system: System, group: Group, overrides: Partial<Expense> = {}): Expense => {
  const expense = buildExpense(group, overrides);
  system.db.insert(expensesTable).values(encodeExpense(expense)).run();
  return expense;
};

export {
  buildAmountSplit,
  buildEqualSplit,
  buildExpense,
  buildExpenseRecord,
  buildGroup,
  buildGroupRecord,
  buildPercentageSplit,
  buildReceipt,
  createExpense,
  createGroup,
};
