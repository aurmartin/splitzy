import { createReceiptSplit } from "@/components/split-input/receipt-split";
import { expensesTable } from "@/lib/db/schema";
import { System } from "@/lib/system";
import { system } from "@/lib/test-setup";
import { buildExpense, buildGroup, buildReceipt } from "@/lib/test-factories";
import { eq } from "drizzle-orm";

import { ExpensesRepository } from "./repository";
import type { Receipt, ReceiptSplit } from "./types";

const group = buildGroup();

const getExpenseById = (system: System, id: string) => {
  const [result] = system.db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.id, id))
    .limit(1)
    .all();

  return result;
};

const getExpensesByGroupId = (system: System, groupId: string) => {
  return system.db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.groupId, groupId))
    .all();
};

const expectReceiptEqual = (left: Receipt, right: Receipt) => {
  expect(left.title).toEqual(right.title);
  expect(left.total.amount).toEqual(right.total.amount);
  expect(left.items.length).toEqual(right.items.length);
  left.items.forEach((item, index) => {
    expect(item.description).toEqual(right.items[index].description);
    expect(item.humanReadableDescription).toEqual(
      right.items[index].humanReadableDescription,
    );
    expect(item.price.amount).toEqual(right.items[index].price.amount);
    expect(item.paid_for).toEqual(right.items[index].paid_for);
  });
};

describe("getExpense", () => {
  it("should return an expense", async () => {
    const testExpense = buildExpense(group);
    await ExpensesRepository.insertExpense(system, testExpense);

    const result = ExpensesRepository.getExpense(system, testExpense.id);

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(testExpense.id);
  });

  it("should return the receipt and the split expense", async () => {
    const testReceipt = buildReceipt(group);
    const testExpense = buildExpense(group, {
      receipt: testReceipt,
      splitExpense: createReceiptSplit(testReceipt, group.members),
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
    const testExpense = buildExpense(group);
    await ExpensesRepository.insertExpense(system, testExpense);

    const result = ExpensesRepository.getExpenseOrThrow(system, testExpense.id);

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(testExpense.id);
  });

  it("should throw an error if the expense does not exist", async () => {
    const testExpense = buildExpense(group);
    await ExpensesRepository.insertExpense(system, testExpense);

    expect(() =>
      ExpensesRepository.getExpenseOrThrow(system, "non-existent-id"),
    ).toThrow();
  });
});

describe("insertExpense", () => {
  it("should insert a basic expense and correctly encode fields", async () => {
    // Arrange
    const testExpense = buildExpense(group);

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
    const receipt = buildReceipt(group);
    const testExpense = buildExpense(group, { receipt });

    // Act
    await ExpensesRepository.insertExpense(system, testExpense);

    // Assert
    const result = getExpenseById(system, testExpense.id);
    expect(result).not.toBeUndefined();

    // Check that the receipt was properly JSON encoded
    const parsedReceipt = JSON.parse(result.receipt as string);
    expect(parsedReceipt.title).toEqual(receipt.title);
    expect(parsedReceipt.total.amount).toEqual(receipt.total.amount);
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
    const expense = buildExpense(group, { deletedAt: deletedDate });

    // Act
    await ExpensesRepository.insertExpense(system, expense);

    // Assert
    const result = getExpenseById(system, expense.id);
    expect(result).not.toBeUndefined();
    expect(result.deletedAt).toEqual(deletedDate.toISOString());
  });

  it("should handle multiple expenses with the same groupId", async () => {
    // Arrange
    const expense1 = buildExpense(group, { title: "Expense 1" });
    const expense2 = buildExpense(group, { title: "Expense 2" });

    // Act
    await ExpensesRepository.insertExpense(system, expense1);
    await ExpensesRepository.insertExpense(system, expense2);

    // Assert
    const results = getExpensesByGroupId(system, group.id);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.title)).toContain("Expense 1");
    expect(results.map((r) => r.title)).toContain("Expense 2");
  });
});

describe("updateExpense", () => {
  it("should update an expense", async () => {
    // Arrange
    const testExpense = buildExpense(group);
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
    const testExpense = buildExpense(group);
    await ExpensesRepository.insertExpense(system, testExpense);

    await ExpensesRepository.deleteExpense(system, testExpense.id);

    const result = getExpenseById(system, testExpense.id);
    expect(result).toBeUndefined();
  });
});
