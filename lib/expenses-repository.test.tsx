import { expensesTable } from "@/lib/db/schema";
import type { Expense, Receipt, ReceiptSplit } from "@/lib/expenses";
import { ExpensesRepository } from "@/lib/expenses-repository";
import { System } from "@/lib/system";
import { system } from "@/lib/test-setup";
import { generateId } from "@/lib/utils";
import dinero, { Currency } from "dinero.js";
import { eq } from "drizzle-orm";

// Helper functions for creating test data
const createBasicExpense = (overrides: Partial<Expense> = {}): Expense => {
  const date = new Date();

  return {
    id: generateId(),
    groupId: generateId(),
    title: "Test Expense",
    payerName: "Test User",
    splitExpense: {
      type: "percentage",
      total: dinero({ amount: 0, currency: "USD" }),
      members: [],
      ratios: {},
    },
    createdAt: date,
    updatedAt: date,
    deletedAt: undefined,
    receipt: null,
    ...overrides,
  };
};

const createReceipt = (): Receipt => ({
  date: new Date("2023-05-15"),
  total: dinero({ amount: 3000, currency: "EUR" }),
  title: "Restaurant Bill",
  currency: "EUR" as Currency,
  items: [
    {
      description: "Main course",
      humanReadableDescription: "Main course",
      price: dinero({ amount: 2000, currency: "EUR" }),
      paid_for: ["Alice", "Bob"],
    },
    {
      description: "Dessert",
      humanReadableDescription: "Dessert",
      price: dinero({ amount: 1000, currency: "EUR" }),
      paid_for: ["Alice"],
    },
  ],
});

// Helper function to retrieve an expense from the database
const getExpenseById = (system: System, id: string) => {
  const [result] = system.db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.id, id))
    .limit(1)
    .all();

  return result;
};

// Helper function to get all expenses from a group
const getExpensesByGroupId = (system: System, groupId: string) => {
  return system.db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.groupId, groupId))
    .all();
};

const expectReceiptEqual = (left: Receipt, right: Receipt) => {
  expect(left.title).toEqual(right.title);
  expect(left.currency).toEqual(right.currency);
  expect(left.total.getAmount()).toEqual(right.total.getAmount());
  expect(left.items.length).toEqual(right.items.length);
  left.items.forEach((item, index) => {
    expect(item.description).toEqual(right.items[index].description);
    expect(item.humanReadableDescription).toEqual(
      right.items[index].humanReadableDescription,
    );
    expect(item.price.getAmount()).toEqual(
      right.items[index].price.getAmount(),
    );
    expect(item.paid_for).toEqual(right.items[index].paid_for);
  });
};

describe("getExpense", () => {
  it("should return an expense", async () => {
    const testExpense = createBasicExpense();
    await ExpensesRepository.insertExpense(system, testExpense);

    const result = ExpensesRepository.getExpense(system, testExpense.id);

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(testExpense.id);
  });

  it("should return the receipt and the split expense", async () => {
    const testReceipt = createReceipt();
    const testSplitExpense: ReceiptSplit = {
      type: "receipt",
      receipt: testReceipt,
      total: testReceipt.total,
      members: testReceipt.items.flatMap((item) => item.paid_for),
    };
    const testExpense = createBasicExpense({
      receipt: testReceipt,
      splitExpense: testSplitExpense,
    });
    await ExpensesRepository.insertExpense(system, testExpense);

    const resultExpense = ExpensesRepository.getExpense(system, testExpense.id);
    const resultReceipt = resultExpense?.receipt!;
    const resultSplitExpense = resultExpense?.splitExpense! as ReceiptSplit;

    expect(resultExpense).not.toBeNull();
    expectReceiptEqual(resultReceipt, testExpense.receipt!);
    expect(resultSplitExpense.type).toEqual("receipt");
    expectReceiptEqual(
      resultSplitExpense.receipt,
      (testExpense.splitExpense as ReceiptSplit).receipt,
    );
  });
});

describe("getExpenseOrThrow", () => {
  it("should return an expense", async () => {
    const testExpense = createBasicExpense();
    await ExpensesRepository.insertExpense(system, testExpense);

    const result = ExpensesRepository.getExpenseOrThrow(system, testExpense.id);

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(testExpense.id);
  });

  it("should throw an error if the expense does not exist", async () => {
    const testExpense = createBasicExpense();
    await ExpensesRepository.insertExpense(system, testExpense);

    expect(() =>
      ExpensesRepository.getExpenseOrThrow(system, "non-existent-id"),
    ).toThrow();
  });
});

describe("insertExpense", () => {
  it("should insert a basic expense and correctly encode fields", async () => {
    // Arrange
    const testExpense = createBasicExpense();

    // Act
    await ExpensesRepository.insertExpense(system, testExpense);

    // Assert
    const result = getExpenseById(system, testExpense.id);

    expect(result).not.toBeUndefined();
    expect(result.id).toEqual(testExpense.id);
    expect(result.groupId).toEqual(testExpense.groupId);
    expect(result.title).toEqual(testExpense.title);
    expect(result.payerName).toEqual(testExpense.payerName);
    expect(result.splitExpense).toEqual(
      JSON.stringify(testExpense.splitExpense),
    );
    expect(result.createdAt).toEqual(testExpense.createdAt.toISOString());
    expect(result.updatedAt).toEqual(testExpense.updatedAt.toISOString());
    expect(result.deletedAt).toEqual(null);
    expect(result.receipt).toEqual(null);
  });

  it("should correctly encode receipt data", async () => {
    // Arrange
    const receipt = createReceipt();
    const testExpense = createBasicExpense({ receipt });

    // Act
    await ExpensesRepository.insertExpense(system, testExpense);

    // Assert
    const result = getExpenseById(system, testExpense.id);
    expect(result).not.toBeUndefined();

    // Check that the receipt was properly JSON encoded
    const parsedReceipt = JSON.parse(result.receipt as string);
    expect(parsedReceipt.title).toEqual(receipt.title);
    expect(parsedReceipt.currency).toEqual(receipt.currency);
    expect(parsedReceipt.total.amount).toEqual(receipt.total.getAmount());
    expect(parsedReceipt.items).toHaveLength(receipt.items.length);
    expect(parsedReceipt.items[0].description).toEqual(
      receipt.items[0].description,
    );
    expect(parsedReceipt.items[0].paid_for).toEqual(receipt.items[0].paid_for);
    expect(parsedReceipt.items[1].paid_for).toEqual(receipt.items[1].paid_for);
  });

  it("should handle deletedAt date", async () => {
    // Arrange
    const deletedDate = new Date("2023-01-03");
    const expense = createBasicExpense({ deletedAt: deletedDate });

    // Act
    await ExpensesRepository.insertExpense(system, expense);

    // Assert
    const result = getExpenseById(system, expense.id);
    expect(result).not.toBeUndefined();
    expect(result.deletedAt).toEqual(deletedDate.toISOString());
  });

  it("should handle multiple expenses with the same groupId", async () => {
    // Arrange
    const groupId = generateId();

    const expense1 = createBasicExpense({
      groupId,
      title: "Expense 1",
    });

    const expense2 = createBasicExpense({
      groupId,
      title: "Expense 2",
    });

    // Act
    await ExpensesRepository.insertExpense(system, expense1);
    await ExpensesRepository.insertExpense(system, expense2);

    // Assert
    const results = getExpensesByGroupId(system, groupId);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.title)).toContain("Expense 1");
    expect(results.map((r) => r.title)).toContain("Expense 2");
  });
});

describe("updateExpense", () => {
  it("should update an expense", async () => {
    // Arrange
    const testExpense = createBasicExpense();
    await ExpensesRepository.insertExpense(system, testExpense);

    // Act
    await ExpensesRepository.updateExpense(system, {
      ...testExpense,
      title: "Updated Title",
    });

    // Assert
    const result = getExpenseById(system, testExpense.id);
    expect(result).not.toBeUndefined();
    expect(result.title).toEqual("Updated Title");
  });
});

describe("deleteExpense", () => {
  it("should delete an expense", async () => {
    const testExpense = createBasicExpense();
    await ExpensesRepository.insertExpense(system, testExpense);

    await ExpensesRepository.deleteExpense(system, testExpense.id);

    const result = getExpenseById(system, testExpense.id);
    expect(result).toBeUndefined();
  });
});
