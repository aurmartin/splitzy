import Button from "@/components/button";
import Card from "@/components/card";
import FAB from "@/components/fab";
import { Screen } from "@/components/screen";
import { useSnackBar } from "@/components/snack-bar";
import { useSystem } from "@/components/system-provider";
import { Text } from "@/components/text";
import { TopBar } from "@/components/top-bar";
import { TopBarAction } from "@/components/top-bar-action";
import { useBalance } from "@/lib/balance";
import { getAbsoluteAmount, getAmountColor } from "@/lib/currency";
import { Env } from "@/lib/env";
import { Expense, ReimbursementService, useExpenses, type Reimbursement } from "@/lib/expenses";
import { Group, useGroup, useMe, getMe } from "@/lib/groups";
import { formatDate, getDeviceLocale } from "@/lib/locale";
import { Money } from "@/lib/money";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useLocalSearchParams, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import React from "react";
import { useTranslation } from "react-i18next";
import { SectionList, Share, View } from "react-native";

interface ExpenseSection {
  title: string;
  data: Expense[];
}

const getSectionTitle = (date: Date, t: TFunction): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return t("group.today");
  } else if (date.toDateString() === yesterday.toDateString()) {
    return t("group.yesterday");
  } else {
    return formatDate(date, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
};

const ReimbursementItem = (props: { group: Group; reimbursement: Reimbursement }) => {
  const { group, reimbursement } = props;
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Card
      style={{ paddingVertical: 12 }}
      onPress={() => router.navigate(`/protected/groups/${group.id}/expenses/${reimbursement.id}`)}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Ionicons name="swap-horizontal" size={20} color="hsl(0 0% 40%)" />
        <Text style={{ flex: 1, color: "hsl(0 0% 40%)" }} numberOfLines={1}>
          {t("reimbursement.summary", {
            payer: reimbursement.payerName,
            recipient: ReimbursementService.getRecipient(reimbursement),
          })}
        </Text>
        <Text style={{ color: "hsl(0 0% 40%)" }}>
          {Money.format(reimbursement.splitExpense.total, getDeviceLocale().languageTag)}
        </Text>
      </View>
    </Card>
  );
};

const ExpenseItem = (props: { group: Group; expense: Expense }) => {
  const { group, expense } = props;
  const router = useRouter();

  if (ReimbursementService.isReimbursement(expense)) {
    return <ReimbursementItem group={group} reimbursement={expense} />;
  }

  return (
    <Card key={expense.id} onPress={() => router.navigate(`/protected/groups/${group.id}/expenses/${expense.id}`)}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>
          <Text type="title" style={{ marginBottom: 8 }}>
            {expense.title}
          </Text>
          <Text style={{ color: "hsl(0 0% 40%)" }}>
            {expense.payerName}, {formatDate(expense.createdAt)}
          </Text>
        </View>

        <Text>{Money.format(expense.splitExpense.total, getDeviceLocale().languageTag)}</Text>
      </View>
    </Card>
  );
};

const Expenses = React.memo(function Expenses(props: { group: Group }) {
  const { group } = props;
  const expenses = useExpenses(group.id);
  const system = useSystem();
  const [refreshing, setRefreshing] = React.useState(false);
  const snackBar = useSnackBar();
  const { t } = useTranslation();

  const sections = React.useMemo(() => {
    const sections: Record<string, Expense[]> = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.createdAt);
      const formattedDate = getSectionTitle(date, t);

      if (!sections[formattedDate]) {
        sections[formattedDate] = [];
      }
      sections[formattedDate].push(expense);
    });

    return Object.entries(sections).map(([date, ids]) => ({
      title: date,
      data: ids,
    }));
  }, [expenses, t]);

  const renderItem = ({ item }: { item: Expense }) => <ExpenseItem group={group} expense={item} />;

  const renderSectionHeader = ({ section }: { section: ExpenseSection }) => (
    <Text style={{ fontWeight: "bold" }}>{section.title}</Text>
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);

    try {
      // Groups too: another member may have added someone to this group.
      await system.syncEngine.syncAllTablesFromRemote();
    } catch {
      snackBar.show(t("group.syncError"), "error");
    } finally {
      setRefreshing(false);
    }
  }, [system, snackBar, t]);

  return (
    <SectionList
      testID="expenses-list"
      contentContainerStyle={{ gap: 8 }}
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      maxToRenderPerBatch={10}
      initialNumToRender={10}
      windowSize={10}
      onRefresh={onRefresh}
      refreshing={refreshing}
      style={{ borderRadius: 8 }}
      ListFooterComponent={<View style={{ height: 80 }} />}
      ListEmptyComponent={<Text>{t("group.noExpenses")}</Text>}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
    />
  );
});

const BalanceDisplay = React.memo(function BalanceDisplay(props: { group: Group }) {
  const { group } = props;
  const balance = useBalance(group);
  const me = useMe(group.id);
  const { t } = useTranslation();

  const myBalance = balance[me];
  const message = myBalance.amount > 0 ? t("group.owed") : myBalance.amount < 0 ? t("group.owe") : t("group.settled");

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "white",
        padding: 16,
        borderRadius: 10,
        marginBottom: 16,
      }}
    >
      <Text type="title">{message}</Text>
      {Money.isZero(myBalance) ? null : (
        <Text type="title" style={{ color: getAmountColor(myBalance) }}>
          {Money.format(getAbsoluteAmount(myBalance), getDeviceLocale().languageTag)}
        </Text>
      )}
      <Button onPress={() => router.navigate(`/protected/groups/${group.id}/balance`)} style={{ marginTop: 8 }}>
        {t("group.reimbursements")}
      </Button>
    </View>
  );
});

const GroupScreen = React.memo(function GroupScreen() {
  const router = useRouter();
  const { groupId }: { groupId: string } = useLocalSearchParams();
  const group = useGroup(groupId);
  const system = useSystem();
  const { t } = useTranslation();

  const shareGroup = React.useCallback(() => {
    if (!group) {
      return;
    }

    const getLink = () => {
      switch (Env.APP_ENV) {
        case "development":
          return `https://splitzy.aurmartin.fr/dev/groups/${group.id}/import`;
        case "preview":
          return `https://splitzy.aurmartin.fr/preview/groups/${group.id}/import`;
        case "production":
          return `https://splitzy.aurmartin.fr/groups/${group.id}/import`;
      }
    };

    const link = getLink();

    Share.share({
      title: t("group.inviteTitle", { name: group.name }),
      message: t("group.inviteMessage", { name: group.name, link }),
    });
  }, [group, t]);

  if (!group || group.deletedAt) {
    return <Redirect href="/protected" />;
  }

  const me = getMe(system, groupId);
  if (me === null || !group.members.includes(me)) {
    return <Redirect href={`/protected/groups/${groupId}/set-me`} />;
  }

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <TopBar
        title={group.name}
        rightActions={
          <>
            <TopBarAction key="share" label={t("group.share")} iconName="share-outline" onPress={shareGroup} />
            <TopBarAction
              key="settings"
              label={t("group.settings")}
              iconName="settings-outline"
              onPress={() => router.navigate(`/protected/groups/${group.id}/settings`)}
            />
          </>
        }
      />

      <BalanceDisplay group={group} />

      <Expenses group={group} />

      <FAB onPress={() => router.navigate(`/protected/groups/${group.id}/new-expense`)}>
        <Ionicons name="add-outline" size={24} color="white" />
      </FAB>
    </Screen>
  );
});

export default GroupScreen;
