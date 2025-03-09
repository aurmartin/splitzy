import { ExpenseForm, type ExpenseFormFields } from "@/components/expense-form";
import { Screen } from "@/components/screen";
import { useSnackBar } from "@/components/snack-bar";
import { TopBar } from "@/components/top-bar";
import { getMajorUnitAmount } from "@/lib/currency";
import { useAddExpense } from "@/lib/expenses";
import { Group, useGroup } from "@/lib/groups";
import { ValidationError } from "@/lib/validation-error";
import { trackEvent } from "@aptabase/react-native";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

const NewExpenseForm = (props: { group: Group }) => {
  const { group } = props;

  const snackBar = useSnackBar();
  const addExpense = useAddExpense();

  const [validationErrors, setValidationErrors] = React.useState({});

  const onSubmit = async (fields: ExpenseFormFields) => {
    try {
      trackEvent("click_new_expense", {
        groupId: group.id,
        amount: getMajorUnitAmount(
          fields.splitExpense.total.getAmount(),
          fields.splitExpense.total.getCurrency(),
        ),
        currency: fields.splitExpense.total.getCurrency(),
        splitType: fields.splitExpense.type,
        participantsCount: fields.splitExpense.members.length,
      });

      const params = {
        ...fields,
        groupId: group.id,
      };

      await addExpense(params);

      snackBar.show("Dépense créée avec succès", "success");

      router.back();
    } catch (error) {
      if (error instanceof ValidationError) {
        setValidationErrors(error.errors);
      } else {
        snackBar.show("Une erreur est survenue", "error");
      }
    }
  };

  return (
    <ExpenseForm
      group={group}
      onSubmit={onSubmit}
      validationErrors={validationErrors}
    />
  );
};

export default function NewExpenseScreen() {
  const { groupId }: { groupId: string } = useLocalSearchParams();
  const group = useGroup(groupId);

  if (!group) {
    throw new Error("Group not found");
  }

  return (
    <Screen>
      <TopBar title="Nouvelle dépense" />

      <NewExpenseForm group={group} />
    </Screen>
  );
}
