import Card from "@/components/card";
import { confirm } from "@/components/confirm";
import Label from "@/components/label";
import { ListGroup } from "@/components/list-group";
import { Screen } from "@/components/screen";
import { useSnackBar } from "@/components/snack-bar";
import { useSystem } from "@/components/system-provider";
import { Text } from "@/components/text";
import { TopBar } from "@/components/top-bar";
import { computeBalance, computeOptimalReimbursements, type Balance, type Reimbursement } from "@/lib/balance";
import { Colors, primaryHue } from "@/lib/constants";
import { getAbsoluteAmount, getAmountColor } from "@/lib/currency";
import { ReimbursementService, useExpenses, type Expense } from "@/lib/expenses";
import { Group, useGroup, useMe } from "@/lib/groups";
import { formatDate, getDeviceLocale } from "@/lib/locale";
import { Money } from "@/lib/money";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Pressable, ScrollView, View } from "react-native";

const RECENT_REIMBURSEMENTS_COUNT = 5;

const MyBalance = React.memo(function MyBalance({ group, balance }: { group: Group; balance: Balance }) {
  const me = useMe(group.id);
  const { t } = useTranslation();

  if (!me) return null;

  const myBalance = balance[me];
  if (!myBalance) return null;

  const message =
    myBalance.amount > 0 ? t("balance.owed") : myBalance.amount < 0 ? t("balance.owe") : t("balance.settled");

  return (
    <Card style={{ gap: 4, alignItems: "center", marginBottom: 24 }}>
      <Text>{message}</Text>
      <Text type="headlineMedium" style={{ color: getAmountColor(myBalance) }}>
        {myBalance.amount !== 0 ? Money.format(getAbsoluteAmount(myBalance), getDeviceLocale().languageTag) : ""}
      </Text>
    </Card>
  );
});

const GroupBalance = React.memo(function GroupBalance({ balance }: { balance: Balance }) {
  const { t } = useTranslation();

  return (
    <>
      <Label>{t("balance.title")}</Label>
      <ListGroup style={{ marginBottom: 24 }}>
        {Object.entries(balance).map(([name, amount]) => (
          <View key={name} style={{ justifyContent: "space-between" }}>
            <Text>{name}</Text>
            <Text style={{ color: getAmountColor(amount) }}>{Money.format(amount, getDeviceLocale().languageTag)}</Text>
          </View>
        ))}
      </ListGroup>
    </>
  );
});

const SettleButton = (props: { onPress: () => void; disabled: boolean }) => {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      accessibilityRole="button"
      accessibilityLabel={t("balance.markSettled")}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: pressed ? Colors.primaryLight : `hsl(${primaryHue} 40% 92%)`,
        opacity: props.disabled ? 0.5 : 1,
      })}
    >
      <Text type="bodyMedium" style={{ color: Colors.primaryDark }}>
        {t("balance.markSettled")}
      </Text>
    </Pressable>
  );
};

const Reimbursements = React.memo(function Reimbursements({ group, balance }: { group: Group; balance: Balance }) {
  const system = useSystem();
  const snackBar = useSnackBar();
  const [pending, setPending] = React.useState(false);
  const { t } = useTranslation();

  const reimbursements = React.useMemo(() => computeOptimalReimbursements(balance), [balance]);

  const confirmSettle = async (reimbursement: Reimbursement) => {
    const amount = Money.format(reimbursement.amount, getDeviceLocale().languageTag);

    const confirmed = await confirm({
      title: t("balance.confirmTitle"),
      message: t("balance.confirmMessage", { from: reimbursement.from, amount, to: reimbursement.to }),
      confirmText: t("common.confirm"),
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

      snackBar.show(t("balance.saved"), "success");
      router.dismissTo(`/protected/groups/${group.id}`);
    } catch (error) {
      console.error("Settle reimbursement error", error);
      snackBar.show(t("common.error"), "error");
      setPending(false);
    }
  };

  if (reimbursements.length === 0) {
    return (
      <View style={{ gap: 8, marginBottom: 24 }}>
        <Label>{t("balance.reimbursements")}</Label>
        <Card>
          <Text>{t("balance.allSettled")}</Text>
        </Card>
      </View>
    );
  }

  return (
    <>
      <Label>{t("balance.reimbursements")}</Label>
      <ListGroup itemHeight={68} style={{ marginBottom: 24 }}>
        {reimbursements.map((reimbursement, index) => (
          <View
            key={`${reimbursement.from}-${reimbursement.to}-${index}`}
            style={{ justifyContent: "space-between", gap: 8 }}
          >
            <View style={{ flexShrink: 1, gap: 2 }}>
              <Text numberOfLines={1}>
                <Trans
                  i18nKey="balance.owes"
                  values={{ from: reimbursement.from, to: reimbursement.to }}
                  components={{ muted: <Text style={{ color: "gray" }} /> }}
                />
              </Text>
              <Text type="titleMedium">{Money.format(reimbursement.amount, getDeviceLocale().languageTag)}</Text>
            </View>
            <SettleButton disabled={pending} onPress={() => confirmSettle(reimbursement)} />
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
  const recent = expenses.filter(ReimbursementService.isReimbursement).slice(0, RECENT_REIMBURSEMENTS_COUNT);
  const { t } = useTranslation();

  if (recent.length === 0) {
    return null;
  }

  return (
    <>
      <Label>{t("balance.recent")}</Label>
      <ListGroup itemHeight={64}>
        {recent.map((reimbursement) => (
          <Pressable
            key={reimbursement.id}
            style={{ justifyContent: "space-between", gap: 8 }}
            onPress={() => router.navigate(`/protected/groups/${group.id}/expenses/${reimbursement.id}`)}
          >
            <View style={{ flexShrink: 1, gap: 2 }}>
              <Text numberOfLines={1}>
                <Trans
                  i18nKey="balance.paidBack"
                  values={{
                    payer: reimbursement.payerName,
                    recipient: ReimbursementService.getRecipient(reimbursement),
                  }}
                  components={{ muted: <Text style={{ color: "gray" }} /> }}
                />
              </Text>
              <Text type="bodyMedium" style={{ color: "hsl(0 0% 40%)" }}>
                {formatDate(reimbursement.createdAt)}
              </Text>
            </View>
            <Text style={{ color: "hsl(0 0% 40%)" }}>
              {Money.format(reimbursement.splitExpense.total, getDeviceLocale().languageTag)}
            </Text>
          </Pressable>
        ))}
      </ListGroup>
    </>
  );
});

const BalanceScreenContent = React.memo(function BalanceScreenContent({ group }: { group: Group }) {
  const expenses = useExpenses(group.id);
  const balance = React.useMemo(() => computeBalance(group, expenses), [group, expenses]);

  return (
    <>
      <MyBalance group={group} balance={balance} />

      <ScrollView showsVerticalScrollIndicator={false} alwaysBounceVertical={false}>
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
