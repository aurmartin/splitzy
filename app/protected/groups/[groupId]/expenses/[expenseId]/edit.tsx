import LoadingScreen from "@/components/loading-screen";
import { Screen } from "@/components/screen";
import { TopBar } from "@/components/top-bar";
import { ExpenseForm, type ExpenseFormFields } from "@/components/expense-form";
import { useSnackBar } from "@/components/snack-bar";
import { ValidationError } from "@/lib/validation-error";
import {
  type Expense,
  useDelExpense,
  useEditExpense,
  useExpense,
} from "@/lib/expenses";
import { Group, useGroup } from "@/lib/groups";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable } from "react-native";

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

const EditExpenseForm = (props: { group: Group; expense: Expense }) => {
  const { group, expense } = props;

  const snackBar = useSnackBar();
  const editExpense = useEditExpense();

  const [promiseState, dispatch] = React.useReducer(promiseStateReducer, {
    validationErrors: {},
    loading: false,
  });

  const onSubmit = async (fields: ExpenseFormFields) => {
    try {
      dispatch({ type: "start" });

      const params = {
        ...fields,
        groupId: group.id,
      };

      await editExpense(expense.id, params);

      dispatch({ type: "success" });

      snackBar.show("Dépense modifiée avec succès", "success");

      router.back();
    } catch (error) {
      if (error instanceof ValidationError) {
        dispatch({ type: "validationError", payload: error.errors });
      } else {
        console.error("Edit expense error", error);

        dispatch({ type: "error", payload: "Une erreur est survenue" });
      }
    }
  };

  if (promiseState.loading) {
    return <LoadingScreen message="Modification de la dépense en cours..." />;
  }

  return (
    <ExpenseForm
      group={group}
      expense={expense}
      onSubmit={onSubmit}
      validationErrors={promiseState.validationErrors}
    />
  );
};

export default function NewExpenseScreen() {
  const { groupId, expenseId }: { groupId: string; expenseId: string } =
    useLocalSearchParams();

  const group = useGroup(groupId);
  const expense = useExpense(expenseId);
  const delExpense = useDelExpense();

  if (!group) {
    throw new Error("Group not found");
  }

  if (!expense) {
    return <LoadingScreen message="Chargement en cours..." />;
  }

  const handleDelete = async () => {
    await delExpense(expenseId);

    router.back();
  };

  return (
    <Screen>
      <TopBar
        title="Modifier la dépense"
        rightActions={[
          <Pressable
            onPress={handleDelete}
            key="delete"
            style={{
              backgroundColor: "hsl(348, 45%, 85%)",
              padding: 8,
              borderRadius: 24,
            }}
            android_ripple={{ color: "hsl(348, 40%, 80%)" }}
          >
            <Ionicons name="trash" size={24} color="hsl(348, 40%, 50%)" />
          </Pressable>,
        ]}
      />

      <EditExpenseForm group={group} expense={expense} />
    </Screen>
  );
}
