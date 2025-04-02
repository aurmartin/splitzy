import { useSystem } from "@/components/system-provider";
import { Expense } from "@/lib/expenses";
import { ExpensesRepository } from "@/lib/expenses-repository";
import { useEffect, useState, useMemo } from "react";

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

export { useExpense, useExpenses };
