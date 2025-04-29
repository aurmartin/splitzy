import { useSystem } from "@/components/system-provider";
import { useEffect, useMemo, useState } from "react";

import { ExpensesRepository } from "./repository";
import type { Expense } from "./types";
import { ExpenseService } from "./service";

function useExpenses(groupId: string): Expense[] {
  const system = useSystem();
  const initialExpenses = useMemo(
    () => ExpensesRepository.getGroupExpenses(system, groupId),
    [system, groupId],
  );
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);

  useEffect(() => {
    return ExpensesRepository.watchGroupExpenses(system, groupId, setExpenses);
  }, [system, groupId]);

  return expenses;
}

function useExpense(id: string): Expense | null {
  const system = useSystem();
  const initialExpense = useMemo(
    () => ExpensesRepository.getExpense(system, id),
    [system, id],
  );
  const [expense, setExpense] = useState<Expense | null>(initialExpense);

  useEffect(() => {
    return ExpensesRepository.watchExpense(system, id, setExpense);
  }, [system, id]);

  return expense;
}

function useAmounts(expense: Expense) {
  return useMemo(() => ExpenseService.getAmounts(expense), [expense]);
}

export { useExpense, useExpenses, useAmounts };
