import Card from "@/components/card";
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
import { ActivityIndicator, View } from "react-native";

const MyBalance = React.memo(function _MyBalance({
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
    <Card>
      <View style={{ gap: 4, alignItems: "center" }}>
        <Text>{getBalanceMessage(myBalance)}</Text>
        <Text
          type="headlineMedium"
          style={{ color: getAmountColor(myBalance) }}
        >
          {myBalance.getAmount() !== 0
            ? getAbsoluteAmount(myBalance).setLocale(getLocale()).toFormat()
            : ""}
        </Text>
      </View>
    </Card>
  );
});

const GroupBalance = React.memo(function _GroupBalance({
  balance,
}: {
  balance: Balance;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text type="titleMedium">Balance</Text>
      {Object.entries(balance).map(([name, amount]) => (
        <Card key={name}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text>{name}</Text>
            <Text style={{ color: getAmountColor(amount) }}>
              {amount.setLocale(getLocale()).toFormat()}
            </Text>
          </View>
        </Card>
      ))}
    </View>
  );
});

const Reimbursements = React.memo(function _Reimbursements({
  balance,
}: {
  balance: Balance;
}) {
  const reimbursements = computeOptimalReimbursements(balance);

  if (reimbursements.length === 0) {
    return (
      <View style={{ gap: 8 }}>
        <Text type="titleMedium">Remboursements</Text>
        <Card>
          <Text>Tout le monde est à jour !</Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <Text type="titleMedium">Remboursements</Text>
      {reimbursements.map((reimbursement, index) => (
        <Card key={index}>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}
          >
            <Text>{reimbursement.from}</Text>
            <Text style={{ color: "gray" }}>doit</Text>
            <Text type="titleMedium">
              {reimbursement.amount.setLocale(getLocale()).toFormat()}
            </Text>
            <Text style={{ color: "gray" }}>à</Text>
            <Text>{reimbursement.to}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
});

const BalanceScreenContent = React.memo(function _BalanceScreenContent({
  group,
}: {
  group: Group;
}) {
  const balance = useBalance(group);

  return (
    <View style={{ flex: 1, gap: 24 }}>
      <MyBalance group={group} balance={balance} />
      <GroupBalance balance={balance} />
      <Reimbursements balance={balance} />
    </View>
  );
});

const BalanceScreen = () => {
  const { groupId }: { groupId: string } = useLocalSearchParams();
  const group = useGroup(groupId);

  if (!group) {
    return <ActivityIndicator />;
  }

  return (
    <Screen>
      <TopBar title={group.name} />
      <BalanceScreenContent group={group} />
    </Screen>
  );
};

export default BalanceScreen;
