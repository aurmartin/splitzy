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

const EditExpenseForm = (props: { group: Group; expense: Expense }) => {
  const { group, expense } = props;

  const snackBar = useSnackBar();
  const editExpense = useEditExpense();

  const [validationErrors, setValidationErrors] = React.useState({});

  const onSubmit = async (fields: ExpenseFormFields) => {
    try {
      const params = {
        ...fields,
        groupId: group.id,
      };

      await editExpense(expense.id, params);

      snackBar.show("Dépense modifiée avec succès", "success");

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
      expense={expense}
      onSubmit={onSubmit}
      validationErrors={validationErrors}
    />
  );
};

export default function EditExpenseScreen() {
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
