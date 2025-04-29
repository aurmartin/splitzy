import { system } from "@/lib/test-setup";
import { act, render, screen } from "@/lib/test-utils";
import { generateId } from "@/lib/utils";
import dinero from "dinero.js";
import { Text, View } from "react-native";

import { useExpense, useExpenses } from "./hooks";
import { ExpensesRepository } from "./repository";
import type { Expense } from "./types";

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

describe("useExpense", () => {
  it("should return an expense", async () => {
    // Arrange
    const testExpense = createBasicExpense();
    await ExpensesRepository.insertExpense(system, testExpense);

    const Test = () => {
      const expense = useExpense(testExpense.id);
      didRender(expense);
      return <Text>{expense?.title}</Text>;
    };

    // Act
    render(<Test />, system);

    // Assert
    await screen.findByText(testExpense.title);

    expect(didRender).toHaveBeenCalledTimes(1);
  });

  it("should re-render when the expense is updated", async () => {
    // Arrange
    const testExpense = createBasicExpense();
    await ExpensesRepository.insertExpense(system, testExpense);

    const Test = () => {
      const expense = useExpense(testExpense.id);
      didRender(expense);
      return <Text>{expense?.title}</Text>;
    };

    // Act
    render(<Test />, system);

    const updatedExpense = {
      ...testExpense,
      title: "Updated Expense",
    };

    await act(async () => {
      await ExpensesRepository.updateExpense(system, updatedExpense);
    });

    // Assert
    await screen.findByText(updatedExpense.title);

    expect(didRender).toHaveBeenCalledTimes(2);
  });
});

describe("useExpenses", () => {
  beforeEach(async () => {
    const groupId = "test-group-id";

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
      const expenses = useExpenses(groupId);
      didRender();
      return (
        <View>
          {expenses.map((expense) => (
            <Text key={expense.id}>{expense.title}</Text>
          ))}
        </View>
      );
    };

    render(<Test />, system);
  });

  it("should return all expenses for a group", async () => {
    await screen.findByText("Test Expense 1");
    await screen.findByText("Test Expense 2");
    expect(didRender).toHaveBeenCalledTimes(1);
  });

  it("should re-render when the expense is inserted", async () => {
    const testExpense3 = createBasicExpense({
      groupId: "test-group-id",
      title: "Test Expense 3",
    });
    await act(async () => {
      await ExpensesRepository.insertExpense(system, testExpense3);
    });
    await screen.findByText("Test Expense 3");
    expect(didRender).toHaveBeenCalledTimes(2);
  });
});
