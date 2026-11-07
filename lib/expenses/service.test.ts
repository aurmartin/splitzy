import { expensesTable } from "@/lib/db/schema";
import { ExpenseService } from "@/lib/expenses";
import { ExpensesRepository } from "@/lib/expenses/repository";
import { System } from "@/lib/system";
import { system } from "@/lib/test-setup";
import {
  buildAmountSplit,
  buildEqualSplit,
  buildExpense,
  buildGroup,
  buildPercentageSplit,
  buildReceipt,
} from "@/lib/test-factories";
import { generateId } from "@/lib/utils";
import { DisplayableError } from "@/lib/displayable-error";
import { eq } from "drizzle-orm";

const group = buildGroup();

const getExpensesByGroupId = (system: System, groupId: string) => {
  return system.db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.groupId, groupId))
    .all();
};

describe("insertExpense", () => {
  it("should create and insert a valid expense", async () => {
    // Create test expense params
    const expenseParams = {
      groupId: generateId(),
      title: "Test Expense",
      payerName: "Test User",
      splitExpense: buildPercentageSplit(group, { Alice: 50, Bob: 50 }),
      receipt: null,
    };

    // Call the function
    await ExpenseService.insertExpense(system, expenseParams);

    // Verify the expense was added to the database
    const expenses = getExpensesByGroupId(system, expenseParams.groupId);

    expect(expenses).toHaveLength(1);
    expect(expenses[0].title).toEqual(expenseParams.title);
    expect(expenses[0].payerName).toEqual(expenseParams.payerName);

    // Verify that an ID was generated
    expect(expenses[0].id).toBeDefined();
    expect(expenses[0].id.length).toBeGreaterThan(0);

    // Verify timestamps were created
    expect(expenses[0].createdAt).toBeDefined();
    expect(expenses[0].updatedAt).toBeDefined();
  });

  it("should handle receipt data", async () => {
    // Create test expense with split expense and receipt
    const expenseParams = {
      groupId: generateId(),
      title: "Complex Expense",
      payerName: "Alice",
      splitExpense: buildPercentageSplit(group, { Alice: 50, Bob: 50 }),
      receipt: buildReceipt(group),
    };

    // Call the function
    await ExpenseService.insertExpense(system, expenseParams);

    // Verify the expense was added to the database
    const expenses = getExpensesByGroupId(system, expenseParams.groupId);
    expect(expenses).toHaveLength(1);

    // Parse the JSON data
    const receipt = JSON.parse(expenses[0].receipt as string);

    // Verify receipt data
    expect(receipt.title).toEqual("Restaurant bill");
    expect(receipt.total.amount).toEqual(3000);
    expect(receipt.items).toHaveLength(2);
    expect(receipt.items[0].description).toEqual("Main course");
    expect(receipt.items[1].description).toEqual("Dessert");
  });

  it("should throw ValidationError for invalid expense params", async () => {
    // Empty title
    const invalidTitleGroupId = generateId();
    const invalidTitleParams = {
      groupId: invalidTitleGroupId,
      title: "",
      payerName: "Test User",
      splitExpense: buildPercentageSplit(group, { Alice: 50, Bob: 50 }),
      receipt: null,
    };

    await expect(
      ExpenseService.insertExpense(system, invalidTitleParams),
    ).rejects.toThrow(DisplayableError);
    await expect(
      ExpenseService.insertExpense(system, invalidTitleParams),
    ).rejects.toThrow(/titre/);

    // Empty payer name
    const invalidPayerGroupId = generateId();
    const invalidPayerParams = {
      groupId: invalidPayerGroupId,
      title: "Test Expense",
      payerName: "",
      splitExpense: buildPercentageSplit(group, { Alice: 50, Bob: 50 }),
      receipt: null,
    };

    await expect(
      ExpenseService.insertExpense(system, invalidPayerParams),
    ).rejects.toThrow(DisplayableError);
    await expect(
      ExpenseService.insertExpense(system, invalidPayerParams),
    ).rejects.toThrow(/membre/);

    // Verify no expenses were added with these groupIds
    const titleExpenses = getExpensesByGroupId(system, invalidTitleGroupId);
    expect(titleExpenses).toHaveLength(0);

    const payerExpenses = getExpensesByGroupId(system, invalidPayerGroupId);
    expect(payerExpenses).toHaveLength(0);
  });
});

describe("deleteExpense", () => {
  it("should delete an expense", async () => {
    const testExpense = buildExpense(group);
    await ExpensesRepository.insertExpense(system, testExpense);

    await ExpenseService.deleteExpense(system, testExpense.id);

    const expenses = getExpensesByGroupId(system, testExpense.groupId);
    expect(expenses).toHaveLength(0);
  });
});

describe("getAmounts", () => {
  it("should compute all amounts when given an amount split with missing amounts", () => {
    const splitExpense = buildAmountSplit(group, { Alice: 250 }, 1000);

    const expense = buildExpense(group, { splitExpense });
    const amounts = ExpenseService.getAmounts(expense);

    expect(amounts.Alice.amount).toEqual(250);
    expect(amounts.Bob.amount).toEqual(750);
  });

  it("should compute all amounts when given a percentage split", () => {
    const splitExpense = buildPercentageSplit(
      group,
      { Alice: 50, Bob: 50 },
      1000,
    );

    const expense = buildExpense(group, { splitExpense });
    const amounts = ExpenseService.getAmounts(expense);

    expect(amounts.Alice.amount).toEqual(500);
    expect(amounts.Bob.amount).toEqual(500);
  });

  it("should compute all amounts when given an equal split", () => {
    const splitExpense = buildEqualSplit(group, 1000);

    const expense = buildExpense(group, { splitExpense });
    const amounts = ExpenseService.getAmounts(expense);

    expect(amounts.Alice.amount).toEqual(500);
    expect(amounts.Bob.amount).toEqual(500);
  });
});
