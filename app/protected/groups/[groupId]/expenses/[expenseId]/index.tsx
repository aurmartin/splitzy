import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { useSnackBar } from "@/components/snack-bar";
import { Text } from "@/components/text";
import { TopBar } from "@/components/top-bar";
import {
  useAmounts,
  useDelExpense,
  useExpense,
  type Expense,
} from "@/lib/expenses";
import { getLocale } from "@/lib/locale";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";

interface ShowExpenseScreenProps {
  groupId: string;
  expense: Expense;
}

function ShowExpenseScreen({ groupId, expense }: ShowExpenseScreenProps) {
  const snackBar = useSnackBar();
  const delExpense = useDelExpense();
  const amounts = useAmounts(expense);

  const handleDelete = async () => {
    try {
      await delExpense(expense.id);

      router.back();

      snackBar.show("Dépense supprimée", "success");
    } catch (error) {
      console.error("Delete expense error", error);

      snackBar.show("Une erreur est survenue", "error");
    }
  };

  const handleEdit = () => {
    router.replace(`/protected/groups/${groupId}/expenses/${expense.id}/edit`);
  };

  return (
    <Screen>
      <ScrollView>
        <TopBar
          rightActions={[
            <Pressable
              onPress={handleEdit}
              key="edit"
              style={{
                backgroundColor: "white",
                padding: 8,
                borderRadius: 24,
              }}
              android_ripple={{ color: "hsl(0 0% 90%)" }}
            >
              <Ionicons name="pencil" size={24} color="hsl(0 0% 40%)" />
            </Pressable>,

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

        <Text type="headline" style={{ marginBottom: 16 }}>
          {expense.title}{" "}
          {expense.splitExpense.total.setLocale(getLocale()).toFormat()}
        </Text>

        <Text style={{ marginBottom: 16 }}>
          Payé par {expense.payerName} le{" "}
          {new Date(expense.createdAt).toLocaleDateString()}
        </Text>

        {Object.entries(amounts).map(([name, amount]) => (
          <View
            key={name}
            style={{
              marginBottom: 8,
              backgroundColor: "white",
              padding: 14,
              elevation: 1,
              borderRadius: 8,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text key={name}>{name}</Text>
            <Text>{amount.setLocale(getLocale()).toFormat()}</Text>
          </View>
        ))}

        {expense.receipt && (
          <View>
            <Text style={{ marginBottom: 8, marginTop: 8 }}>Receipt</Text>

            <View
              style={{
                flex: 1,
                gap: 16,
                backgroundColor: "white",
                padding: 16,
                elevation: 1,
                borderRadius: 8,
              }}
            >
              {expense.receipt.items.map((item) => (
                <View
                  key={item.description}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text>{item.humanReadableDescription}</Text>
                    <Text
                      type="bodyMedium"
                      style={{ color: "hsl(0, 0%, 40%)" }}
                    >
                      {item.description}
                    </Text>
                  </View>
                  <Text>{item.price.setLocale(getLocale()).toFormat()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

export default function ShowExpenseRoute() {
  const { expenseId, groupId }: { expenseId: string; groupId: string } =
    useLocalSearchParams();

  const expense = useExpense(expenseId);

  if (!expense) {
    return null;
  }

  return <ShowExpenseScreen groupId={groupId} expense={expense} />;
}
