import { ExpenseForm, type ExpenseFormFields } from "@/components/expense-form";
import LoadingScreen from "@/components/loading-screen";
import { Screen } from "@/components/screen";
import { useSnackBar } from "@/components/snack-bar";
import { useSystem } from "@/components/system-provider";
import { DisplayableError } from "@/lib/displayable-error";
import { type Expense, ExpenseService, ReimbursementService, useExpense } from "@/lib/expenses";
import { Group, useGroup } from "@/lib/groups";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

const EditExpenseForm = (props: { group: Group; expense: Expense; onDelete?: () => void }) => {
  const { group, expense, onDelete } = props;

  const snackBar = useSnackBar();
  const system = useSystem();
  const { t } = useTranslation();

  const onSubmit = async (fields: ExpenseFormFields) => {
    try {
      const params = {
        ...fields,
        groupId: group.id,
      };

      await ExpenseService.updateExpense(system, expense.id, params);

      snackBar.show(t("expense.updated"), "success");

      router.back();
    } catch (error) {
      console.error(error);
      if (error instanceof DisplayableError) {
        snackBar.show(error.message, "error");
      } else {
        snackBar.show(t("common.error"), "error");
      }
    }
  };

  return <ExpenseForm group={group} expense={expense} onSubmit={onSubmit} onDelete={onDelete} />;
};

export default function EditExpenseScreen() {
  const { groupId, expenseId }: { groupId: string; expenseId: string } = useLocalSearchParams();

  const group = useGroup(groupId);
  const expense = useExpense(expenseId);
  const system = useSystem();
  const { t } = useTranslation();

  if (!group) {
    throw new Error("Group not found");
  }

  if (!expense) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  // Reimbursements cannot be edited.
  if (ReimbursementService.isReimbursement(expense)) {
    return <Redirect href={`/protected/groups/${groupId}/expenses/${expenseId}`} />;
  }

  const handleDelete = async () => {
    await ExpenseService.deleteExpense(system, expenseId);

    router.back();
  };

  return (
    <Screen>
      <EditExpenseForm group={group} expense={expense} onDelete={handleDelete} />
    </Screen>
  );
}
