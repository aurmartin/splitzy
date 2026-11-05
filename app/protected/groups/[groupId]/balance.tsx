import Card from "@/components/card";
import { confirm } from "@/components/confirm";
import Label from "@/components/label";
import { ListGroup } from "@/components/list-group";
import { Screen } from "@/components/screen";
import { useSnackBar } from "@/components/snack-bar";
import { useSystem } from "@/components/system-provider";
import { Text } from "@/components/text";
import { TopBar } from "@/components/top-bar";
import {
  computeBalance,
  computeOptimalReimbursements,
  type Balance,
  type Reimbursement,
} from "@/lib/balance";
import { Colors, primaryHue } from "@/lib/constants";
import {
  getAbsoluteAmount,
  getAmountColor,
  getBalanceMessage,
} from "@/lib/currency";
import {
  ReimbursementService,
  useExpenses,
  type Expense,
} from "@/lib/expenses";
import { Group, useGroup, useMe } from "@/lib/groups";
import { getLocale } from "@/lib/locale";
import { Money } from "@/lib/money";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, ScrollView, View } from "react-native";

const RECENT_REIMBURSEMENTS_COUNT = 5;

const MyBalance = React.memo(function MyBalance({
  group,
  balance,
}: {
  group: Group;
  balance: Balance;
}) {
  const me = useMe(group.id);

  if (!me) return null;

  const myBalance = balance[me];
  if (!myBalance) return null;

  return (
    <Card style={{ gap: 4, alignItems: "center", marginBottom: 24 }}>
      <Text>{getBalanceMessage(myBalance)}</Text>
      <Text type="headlineMedium" style={{ color: getAmountColor(myBalance) }}>
        {myBalance.amount !== 0
          ? Money.format(getAbsoluteAmount(myBalance), getLocale())
          : ""}
      </Text>
    </Card>
  );
});

const GroupBalance = React.memo(function GroupBalance({
  balance,
}: {
  balance: Balance;
}) {
  return (
    <>
      <Label>Balance</Label>
      <ListGroup style={{ marginBottom: 24 }}>
        {Object.entries(balance).map(([name, amount]) => (
          <View key={name} style={{ justifyContent: "space-between" }}>
            <Text>{name}</Text>
            <Text style={{ color: getAmountColor(amount) }}>
              {Money.format(amount, getLocale())}
            </Text>
          </View>
        ))}
      </ListGroup>
    </>
  );
});

const SettleButton = (props: { onPress: () => void; disabled: boolean }) => (
  <Pressable
    onPress={props.onPress}
    disabled={props.disabled}
    accessibilityRole="button"
    accessibilityLabel="Marquer comme réglé"
    style={({ pressed }) => ({
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: pressed
        ? Colors.primaryLight
        : `hsl(${primaryHue} 40% 92%)`,
      opacity: props.disabled ? 0.5 : 1,
    })}
  >
    <Text type="bodyMedium" style={{ color: Colors.primaryDark }}>
      Marquer comme réglé
    </Text>
  </Pressable>
);

const Reimbursements = React.memo(function Reimbursements({
  group,
  balance,
}: {
  group: Group;
  balance: Balance;
}) {
  const system = useSystem();
  const snackBar = useSnackBar();
  const [pending, setPending] = React.useState(false);

  const reimbursements = React.useMemo(
    () => computeOptimalReimbursements(balance),
    [balance],
  );

  const confirmSettle = async (reimbursement: Reimbursement) => {
    const amount = Money.format(reimbursement.amount, getLocale());

    const confirmed = await confirm({
      title: "Marquer comme réglé ?",
      message: `${reimbursement.from} a remboursé ${amount} à ${reimbursement.to}.`,
      confirmText: "Confirmer",
    });

    if (confirmed) {
      await settle(reimbursement);
    }
  };

  const settle = async (reimbursement: Reimbursement) => {
    if (pending) return;
    setPending(true);

    try {
      await ReimbursementService.insertReimbursement(system, {
        groupId: group.id,
        from: reimbursement.from,
        to: reimbursement.to,
        amount: reimbursement.amount,
      });

      snackBar.show("Remboursement enregistré", "success");
      router.dismissTo(`/protected/groups/${group.id}`);
    } catch (error) {
      console.error("Settle reimbursement error", error);
      snackBar.show("Une erreur est survenue", "error");
      setPending(false);
    }
  };

  if (reimbursements.length === 0) {
    return (
      <View style={{ gap: 8, marginBottom: 24 }}>
        <Label>Remboursements</Label>
        <Card>
          <Text>Tout le monde est à jour !</Text>
        </Card>
      </View>
    );
  }

  return (
    <>
      <Label>Remboursements</Label>
      <ListGroup itemHeight={68} style={{ marginBottom: 24 }}>
        {reimbursements.map((reimbursement, index) => (
          <View
            key={`${reimbursement.from}-${reimbursement.to}-${index}`}
            style={{ justifyContent: "space-between", gap: 8 }}
          >
            <View style={{ flexShrink: 1, gap: 2 }}>
              <Text numberOfLines={1}>
                {reimbursement.from}
                <Text style={{ color: "gray" }}> doit à </Text>
                {reimbursement.to}
              </Text>
              <Text type="titleMedium">
                {Money.format(reimbursement.amount, getLocale())}
              </Text>
            </View>
            <SettleButton
              disabled={pending}
              onPress={() => confirmSettle(reimbursement)}
            />
          </View>
        ))}
      </ListGroup>
    </>
  );
});

const RecentReimbursements = React.memo(function RecentReimbursements({
  group,
  expenses,
}: {
  group: Group;
  expenses: Expense[];
}) {
  const recent = expenses
    .filter(ReimbursementService.isReimbursement)
    .slice(0, RECENT_REIMBURSEMENTS_COUNT);

  if (recent.length === 0) {
    return null;
  }

  return (
    <>
      <Label>Derniers remboursements</Label>
      <ListGroup itemHeight={64}>
        {recent.map((reimbursement) => (
          <Pressable
            key={reimbursement.id}
            style={{ justifyContent: "space-between", gap: 8 }}
            onPress={() =>
              router.navigate(
                `/protected/groups/${group.id}/expenses/${reimbursement.id}`,
              )
            }
          >
            <View style={{ flexShrink: 1, gap: 2 }}>
              <Text numberOfLines={1}>
                {reimbursement.payerName}
                <Text style={{ color: "gray" }}> a remboursé </Text>
                {ReimbursementService.getRecipient(reimbursement)}
              </Text>
              <Text type="bodyMedium" style={{ color: "hsl(0 0% 40%)" }}>
                {reimbursement.createdAt.toLocaleDateString()}
              </Text>
            </View>
            <Text style={{ color: "hsl(0 0% 40%)" }}>
              {Money.format(reimbursement.splitExpense.total, getLocale())}
            </Text>
          </Pressable>
        ))}
      </ListGroup>
    </>
  );
});

const BalanceScreenContent = React.memo(function BalanceScreenContent({
  group,
}: {
  group: Group;
}) {
  const expenses = useExpenses(group.id);
  const balance = React.useMemo(
    () => computeBalance(group, expenses),
    [group, expenses],
  );

  return (
    <>
      <MyBalance group={group} balance={balance} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
      >
        <View style={{ flex: 1, paddingBottom: 24 }}>
          <GroupBalance balance={balance} />
          <Reimbursements group={group} balance={balance} />
          <RecentReimbursements group={group} expenses={expenses} />
        </View>
      </ScrollView>
    </>
  );
});

const BalanceScreen = () => {
  const { groupId }: { groupId: string } = useLocalSearchParams();
  const group = useGroup(groupId);

  if (!group) {
    throw new Error("Group not found");
  }

  return (
    <Screen>
      <TopBar title={group.name} />
      <BalanceScreenContent group={group} />
    </Screen>
  );
};

export default BalanceScreen;
