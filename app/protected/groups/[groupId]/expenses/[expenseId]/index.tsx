import { confirm } from "@/components/confirm";
import Label from "@/components/label";
import { ListGroup } from "@/components/list-group";
import { Screen } from "@/components/screen";
import { useSnackBar } from "@/components/snack-bar";
import { useSystem } from "@/components/system-provider";
import { Text } from "@/components/text";
import { TopBar } from "@/components/top-bar";
import { TopBarAction, TopBarDeleteAction } from "@/components/top-bar-action";
import {
  ExpenseService,
  ReimbursementService,
  useAmounts,
  useExpense,
  type Expense,
  type Reimbursement,
} from "@/lib/expenses";
import { getLocale } from "@/lib/locale";
import { Money } from "@/lib/money";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";

// A reimbursement cannot be edited: to fix one, delete it and settle again.
function ShowReimbursementScreen({ reimbursement }: { reimbursement: Reimbursement }) {
  const snackBar = useSnackBar();
  const system = useSystem();

  const deleteReimbursement = async () => {
    try {
      await ExpenseService.deleteExpense(system, reimbursement.id);
      router.back();
      snackBar.show("Remboursement supprimé", "success");
    } catch (error) {
      console.error("Delete reimbursement error", error);
      snackBar.show("Une erreur est survenue", "error");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Supprimer ce remboursement ?",
      message: "La balance sera recalculée.",
      confirmText: "Supprimer",
      destructive: true,
    });

    if (confirmed) {
      await deleteReimbursement();
    }
  };

  return (
    <Screen>
      <TopBar rightActions={<TopBarDeleteAction onPress={handleDelete} />} />

      <Text type="headlineMedium" style={{ marginBottom: 16 }}>
        Remboursement {Money.format(reimbursement.splitExpense.total, getLocale())}
      </Text>

      <Text style={{ marginBottom: 16 }}>
        {reimbursement.payerName} a remboursé {ReimbursementService.getRecipient(reimbursement)} le{" "}
        {reimbursement.createdAt.toLocaleDateString()}
      </Text>
    </Screen>
  );
}

interface ShowExpenseScreenProps {
  groupId: string;
  expense: Expense;
}

function ShowExpenseScreen({ groupId, expense }: ShowExpenseScreenProps) {
  const snackBar = useSnackBar();
  const system = useSystem();
  const amounts = useAmounts(expense);

  const handleDelete = async () => {
    try {
      await ExpenseService.deleteExpense(system, expense.id);

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
      <TopBar
        rightActions={
          <>
            <TopBarDeleteAction onPress={handleDelete} />
            <TopBarAction iconName="pencil" onPress={handleEdit} />
          </>
        }
      />

      <Text type="headlineMedium" style={{ marginBottom: 16 }}>
        {expense.title} {Money.format(expense.splitExpense.total, getLocale())}
      </Text>

      <Text style={{ marginBottom: 16 }}>
        Payé par {expense.payerName} le {new Date(expense.createdAt).toLocaleDateString()}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} alwaysBounceVertical={false}>
        <Label>Répartition</Label>
        <ListGroup style={{ marginBottom: 16 }}>
          {Object.entries(amounts).map(([name, amount]) => (
            <View key={name} style={{ justifyContent: "space-between" }}>
              <Text key={name}>{name}</Text>
              <Text>{Money.format(amount, getLocale())}</Text>
            </View>
          ))}
        </ListGroup>

        {expense.receipt && (
          <>
            <Label>Ticket de caisse</Label>
            <ListGroup itemHeight={70}>
              {expense.receipt.items.map((item) => (
                <View key={item.description}>
                  <View style={{ gap: 4, flex: 1, marginRight: 16 }}>
                    <Text style={{ flexShrink: 1 }} numberOfLines={1} ellipsizeMode="middle">
                      {item.humanReadableDescription}
                    </Text>
                    <Text type="bodyMedium" style={{ color: "hsl(0, 0%, 40%)" }}>
                      {item.description}
                    </Text>
                  </View>

                  <Text>{Money.format(item.price, getLocale())}</Text>
                </View>
              ))}
            </ListGroup>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

export default function ShowExpenseRoute() {
  const { expenseId, groupId }: { expenseId: string; groupId: string } = useLocalSearchParams();

  const expense = useExpense(expenseId);

  if (!expense) {
    return null;
  }

  if (ReimbursementService.isReimbursement(expense)) {
    return <ShowReimbursementScreen reimbursement={expense} />;
  }

  return <ShowExpenseScreen groupId={groupId} expense={expense} />;
}
