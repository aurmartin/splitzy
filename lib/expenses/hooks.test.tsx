import { system } from "@/lib/test-setup";
import { act, render, screen } from "@/lib/test-utils";
import { buildExpense, buildGroup } from "@/lib/test-factories";
import { Text, View } from "react-native";

import { useExpense, useExpenses } from "./hooks";
import { ExpensesRepository } from "./repository";

const didRender = jest.fn();

const group = buildGroup();

describe("useExpense", () => {
  it("should return an expense", async () => {
    // Arrange
    const testExpense = buildExpense(group);
    await ExpensesRepository.insertExpense(system, testExpense);

    const Test = () => {
      const expense = useExpense(testExpense.id);
      didRender(expense);
      return <Text>{expense?.title}</Text>;
    };

    // Act
    await render(<Test />, system);

    // Assert
    await screen.findByText(testExpense.title);

    expect(didRender).toHaveBeenCalledTimes(1);
  });

  it("should re-render when the expense is updated", async () => {
    // Arrange
    const testExpense = buildExpense(group);
    await ExpensesRepository.insertExpense(system, testExpense);

    const Test = () => {
      const expense = useExpense(testExpense.id);
      didRender(expense);
      return <Text>{expense?.title}</Text>;
    };

    // Act
    await render(<Test />, system);

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
    const testExpense1 = buildExpense(group, { title: "Test Expense 1" });
    const testExpense2 = buildExpense(group, { title: "Test Expense 2" });

    await ExpensesRepository.insertExpense(system, testExpense1);
    await ExpensesRepository.insertExpense(system, testExpense2);

    const Test = () => {
      const expenses = useExpenses(group.id);
      didRender();
      return (
        <View>
          {expenses.map((expense) => (
            <Text key={expense.id}>{expense.title}</Text>
          ))}
        </View>
      );
    };

    await render(<Test />, system);
  });

  it("should return all expenses for a group", async () => {
    await screen.findByText("Test Expense 1");
    await screen.findByText("Test Expense 2");
    expect(didRender).toHaveBeenCalledTimes(1);
  });

  it("should re-render when the expense is inserted", async () => {
    const testExpense3 = buildExpense(group, { title: "Test Expense 3" });
    await act(async () => {
      await ExpensesRepository.insertExpense(system, testExpense3);
    });
    await screen.findByText("Test Expense 3");
    expect(didRender).toHaveBeenCalledTimes(2);
  });
});
