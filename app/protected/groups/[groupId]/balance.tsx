import Card from "@/components/card";
import Label from "@/components/label";
import { ListGroup } from "@/components/list-group";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TopBar } from "@/components/top-bar";
import {
  useBalance,
  computeOptimalReimbursements,
  type Balance,
} from "@/lib/balance";
import {
  getAbsoluteAmount,
  getAmountColor,
  getBalanceMessage,
} from "@/lib/currency";
import { Group, useGroup, useMe } from "@/lib/groups";
import { getLocale } from "@/lib/locale";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, View } from "react-native";

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
        {myBalance.getAmount() !== 0
          ? getAbsoluteAmount(myBalance).setLocale(getLocale()).toFormat()
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
              {amount.setLocale(getLocale()).toFormat()}
            </Text>
          </View>
        ))}
      </ListGroup>
    </>
  );
});

const Reimbursements = React.memo(function Reimbursements({
  balance,
}: {
  balance: Balance;
}) {
  const reimbursements = computeOptimalReimbursements(balance);

  if (reimbursements.length === 0) {
    return (
      <View style={{ gap: 8 }}>
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
      <ListGroup>
        {reimbursements.map((reimbursement, index) => (
          <View key={index} style={{ gap: 4 }}>
            <Text>{reimbursement.from}</Text>
            <Text style={{ color: "gray" }}>doit</Text>
            <Text type="titleMedium">
              {reimbursement.amount.setLocale(getLocale()).toFormat()}
            </Text>
            <Text style={{ color: "gray" }}>à</Text>
            <Text>{reimbursement.to}</Text>
          </View>
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
  const balance = useBalance(group);

  return (
    <>
      <MyBalance group={group} balance={balance} />

      <ScrollView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingBottom: 24 }}>
          <GroupBalance balance={balance} />
          <Reimbursements balance={balance} />
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
