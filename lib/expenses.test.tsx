import { expensesTable } from "@/lib/db/schema";
import {
  addExpense,
  getAmounts,
  useAddExpense,
  useDelExpense,
  type AmountSplit,
  type EqualSplit,
  type Expense,
  type PercentageSplit,
  type Receipt,
} from "@/lib/expenses";
import { ExpensesRepository } from "@/lib/expenses-repository";
import { System } from "@/lib/system";
import { system } from "@/lib/test-setup";
import { fireEvent, render, screen, waitFor } from "@/lib/test-utils";
import { generateId } from "@/lib/utils";
import { ValidationError } from "@/lib/validation-error";
import dinero, { Currency } from "dinero.js";
import { eq } from "drizzle-orm";
import React from "react";
import { Button } from "react-native";

const didRender = jest.fn();

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

const createSplitExpense = (): Expense["splitExpense"] => ({
  type: "percentage",
  total: dinero({ amount: 0, currency: "USD" }),
  members: ["Alice", "Bob"],
  ratios: {
    Alice: 50,
    Bob: 50,
  },
});

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

// Helper function to get all expenses from a group
const getExpensesByGroupId = (system: System, groupId: string) => {
  return system.db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.groupId, groupId))
    .all();
};

describe("addExpense", () => {
  it("should create and insert a valid expense", async () => {
    // Create test expense params
    const expenseParams = {
      groupId: generateId(),
      title: "Test Expense",
      payerName: "Test User",
      splitExpense: createSplitExpense(),
      receipt: null,
    };

    // Call the function
    await addExpense(system, expenseParams);

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
      splitExpense: createSplitExpense(),
      receipt: createReceipt(),
    };

    // Call the function
    await addExpense(system, expenseParams);

    // Verify the expense was added to the database
    const expenses = getExpensesByGroupId(system, expenseParams.groupId);
    expect(expenses).toHaveLength(1);

    // Parse the JSON data
    const receipt = JSON.parse(expenses[0].receipt as string);

    // Verify receipt data
    expect(receipt.title).toEqual("Restaurant Bill");
    expect(receipt.currency).toEqual("EUR");
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
      splitExpense: createSplitExpense(),
      receipt: null,
    };

    await expect(addExpense(system, invalidTitleParams)).rejects.toThrow(
      ValidationError,
    );
    await expect(addExpense(system, invalidTitleParams)).rejects.toThrow(
      /titre/,
    );

    // Empty payer name
    const invalidPayerGroupId = generateId();
    const invalidPayerParams = {
      groupId: invalidPayerGroupId,
      title: "Test Expense",
      payerName: "",
      splitExpense: createSplitExpense(),
      receipt: null,
    };

    await expect(addExpense(system, invalidPayerParams)).rejects.toThrow(
      ValidationError,
    );
    await expect(addExpense(system, invalidPayerParams)).rejects.toThrow(
      /membre/,
    );

    // Verify no expenses were added with these groupIds
    const titleExpenses = getExpensesByGroupId(system, invalidTitleGroupId);
    expect(titleExpenses).toHaveLength(0);

    const payerExpenses = getExpensesByGroupId(system, invalidPayerGroupId);
    expect(payerExpenses).toHaveLength(0);
  });
});

describe("useAddExpense", () => {
  it("should add an expense", async () => {
    // Arrange
    const expenseParams = {
      groupId: generateId(),
      title: "title",
      payerName: "payerName",
      splitExpense: createSplitExpense(),
      receipt: null,
    };

    const Test = () => {
      const addExpense = useAddExpense();
      didRender();
      return (
        <Button title="addExpense" onPress={() => addExpense(expenseParams)} />
      );
    };

    // Act
    render(<Test />, system);

    const button = screen.getByText("addExpense");
    fireEvent.press(button);

    // Assert
    await waitFor(() => {
      const expenses = getExpensesByGroupId(system, expenseParams.groupId);
      expect(expenses).toHaveLength(1);
      expect(expenses[0].title).toEqual(expenseParams.title);
      expect(expenses[0].payerName).toEqual(expenseParams.payerName);
    });

    expect(didRender).toHaveBeenCalledTimes(1);
  });
});

describe("useDelExpense", () => {
  it("should delete an expense", async () => {
    // Arrange
    const testExpense = createBasicExpense();
    await ExpensesRepository.insertExpense(system, testExpense);

    const Test = () => {
      const delExpense = useDelExpense();
      didRender();
      return (
        <Button title="delExpense" onPress={() => delExpense(testExpense.id)} />
      );
    };

    // Act
    render(<Test />, system);

    const button = screen.getByText("delExpense");
    fireEvent.press(button);

    // Assert
    await waitFor(() => {
      const expenses = getExpensesByGroupId(system, testExpense.groupId);
      expect(expenses).toHaveLength(0);
    });

    expect(didRender).toHaveBeenCalledTimes(1);
  });
});

describe("getAmounts", () => {
  it("should compute all amounts when given an amount split with missing amounts", () => {
    const splitExpense: AmountSplit = {
      type: "amount",
      total: dinero({ amount: 1000, currency: "USD" }),
      members: ["Alice", "Bob"],
      amounts: {
        Alice: dinero({ amount: 250, currency: "USD" }),
      },
    };

    const expense = createBasicExpense({ splitExpense });
    const amounts = getAmounts(expense);

    expect(amounts.Alice.getAmount()).toEqual(250);
    expect(amounts.Bob.getAmount()).toEqual(750);
  });

  it("should compute all amounts when given a percentage split", () => {
    const splitExpense: PercentageSplit = {
      type: "percentage",
      total: dinero({ amount: 1000, currency: "USD" }),
      members: ["Alice", "Bob"],
      ratios: {
        Alice: 50,
        Bob: 50,
      },
    };

    const expense = createBasicExpense({ splitExpense });
    const amounts = getAmounts(expense);

    expect(amounts.Alice.getAmount()).toEqual(500);
    expect(amounts.Bob.getAmount()).toEqual(500);
  });

  it("should compute all amounts when given an equal split", () => {
    const splitExpense: EqualSplit = {
      type: "equal",
      total: dinero({ amount: 1000, currency: "USD" }),
      members: ["Alice", "Bob"],
    };

    const expense = createBasicExpense({ splitExpense });
    const amounts = getAmounts(expense);

    expect(amounts.Alice.getAmount()).toEqual(500);
    expect(amounts.Bob.getAmount()).toEqual(500);
  });
});
