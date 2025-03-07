import { expensesTable } from "@/lib/db/schema";
import type { Expense, Receipt } from "@/lib/expenses";
import { ExpensesRepository } from "@/lib/expenses-repository";
import { System } from "@/lib/system";
import {
  clearDatabase,
  createDatabase,
  createSupabaseServer,
  render,
  screen,
} from "@/lib/test-utils";
import { generateId } from "@/lib/utils";
import dinero, { Currency } from "dinero.js";
import { eq } from "drizzle-orm";
import { ReactElement } from "react";
import { Text, View } from "react-native";

// Setup
const server = createSupabaseServer();
let system: System;
let didRender: jest.Mock<(rendered: ReactElement) => ReactElement>;

beforeEach(() => {
  didRender = jest.fn((rendered) => rendered);
  clearDatabase(system.db);
});

beforeAll(async () => {
  server.listen();
  system = new System(createDatabase());
  await system.initializeMigrations();
});

afterEach(() => server.resetHandlers());

afterAll(() => {
  server.close();
  system.dispose();
});

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

describe("getExpense", () => {
  it("should return an expense", async () => {
    const testExpense = createBasicExpense();
    await ExpensesRepository.insertExpense(system, testExpense);

    const result = ExpensesRepository.getExpense(system, testExpense.id);

    expect(result).toBeDefined();
    expect(result?.id).toEqual(testExpense.id);
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

describe("useExpense", () => {
  it("should return an expense", async () => {
    // Arrange
    const testExpense = createBasicExpense();
    await ExpensesRepository.insertExpense(system, testExpense);

    const Test = () => {
      const expense = ExpensesRepository.useExpense(testExpense.id);
      didRender();
      return <Text>{expense?.title}</Text>;
    };

    // Act
    render(<Test />, system);

    // Assert
    await screen.findByText(testExpense.title);

    expect(didRender).toHaveBeenCalledTimes(1);
  });
});

describe("useExpenses", () => {
  it("should return all expenses for a group", async () => {
    // Arrange
    const groupId = generateId();

    const testExpense1 = createBasicExpense({
      groupId,
      title: "Test Expense 1",
    });

    const testExpense2 = createBasicExpense({
      groupId,
      title: "Test Expense 2",
    });

    await ExpensesRepository.insertExpense(system, testExpense1);
    await ExpensesRepository.insertExpense(system, testExpense2);

    const Test = () => {
      const expenses = ExpensesRepository.useExpenses(groupId);
      didRender();
      return (
        <View>
          {expenses.map((expense) => (
            <Text key={expense.id}>{expense.title}</Text>
          ))}
        </View>
      );
    };

    // Act
    render(<Test />, system);

    // Assert
    await screen.findByText(testExpense1.title);
    await screen.findByText(testExpense2.title);

    expect(didRender).toHaveBeenCalledTimes(1);
  });
});
