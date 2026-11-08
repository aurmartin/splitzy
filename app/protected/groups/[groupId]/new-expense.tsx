import { ExpenseForm, type ExpenseFormFields } from "@/components/expense-form";
import { Screen } from "@/components/screen";
import { useSnackBar } from "@/components/snack-bar";
import { useSystem } from "@/components/system-provider";
import { ExpenseService } from "@/lib/expenses";
import { Group, useGroup } from "@/lib/groups";
import { DisplayableError } from "@/lib/displayable-error";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

const NewExpenseForm = (props: { group: Group }) => {
  const { group } = props;

  const snackBar = useSnackBar();
  const system = useSystem();
  const { t } = useTranslation();

  const onSubmit = async (fields: ExpenseFormFields) => {
    try {
      const params = {
        ...fields,
        groupId: group.id,
      };

      await ExpenseService.insertExpense(system, params);

      snackBar.show(t("expense.created"), "success");

      router.back();
    } catch (error) {
      if (error instanceof DisplayableError) {
        snackBar.show(error.message, "error");
      } else {
        snackBar.show(t("common.error"), "error");
      }
    }
  };

  return <ExpenseForm group={group} onSubmit={onSubmit} />;
};

export default function NewExpenseScreen() {
  const { groupId }: { groupId: string } = useLocalSearchParams();
  const group = useGroup(groupId);

  if (!group) {
    throw new Error("Group not found");
  }

  return (
    <Screen>
      <NewExpenseForm group={group} />
    </Screen>
  );
}
