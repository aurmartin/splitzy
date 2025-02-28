import { ExpenseForm, type ExpenseFormFields } from "@/components/expense-form";
import LoadingScreen from "@/components/loading-screen";
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

type PromiseState = {
  loading: boolean;
  validationErrors: Record<string, string>;
  error?: string;
};

type Action =
  | { type: "start" }
  | { type: "validationError"; payload: Record<string, string> }
  | { type: "error"; payload: string }
  | { type: "success" };

function promiseStateReducer(_state: PromiseState, action: Action) {
  switch (action.type) {
    case "start":
      return { loading: true, validationErrors: {} };
    case "validationError":
      return { loading: false, validationErrors: action.payload };
    case "error":
      return { loading: false, validationErrors: {}, error: action.payload };
    case "success":
      return { loading: false, validationErrors: {} };
  }
}

const NewExpenseForm = (props: { group: Group }) => {
  const { group } = props;

  const snackBar = useSnackBar();
  const addExpense = useAddExpense();

  const [promiseState, dispatch] = React.useReducer(promiseStateReducer, {
    validationErrors: {},
    loading: false,
  });

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

      dispatch({ type: "start" });

      const params = {
        ...fields,
        groupId: group.id,
      };

      await addExpense(params);

      dispatch({ type: "success" });

      snackBar.show("Dépense créée avec succès", "success");

      router.back();
    } catch (error) {
      if (error instanceof ValidationError) {
        dispatch({ type: "validationError", payload: error.errors });
      } else {
        console.error("Create expense error", error);

        dispatch({ type: "error", payload: "Une erreur est survenue" });

        snackBar.show("Une erreur est survenue", "error");
      }
    }
  };

  if (promiseState.loading) {
    return <LoadingScreen message="Création de la dépense en cours..." />;
  }

  return (
    <ExpenseForm
      group={group}
      onSubmit={onSubmit}
      validationErrors={promiseState.validationErrors}
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
