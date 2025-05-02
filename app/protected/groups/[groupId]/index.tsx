import Button from "@/components/button";
import Card from "@/components/card";
import FAB from "@/components/fab";
import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { useSnackBar } from "@/components/snack-bar";
import { useSystem } from "@/components/system-provider";
import { Text } from "@/components/text";
import { TopBar } from "@/components/top-bar";
import { useBalance } from "@/lib/balance";
import {
  getAbsoluteAmount,
  getAmountColor,
  getBalanceMessage,
} from "@/lib/currency";
import { tables } from "@/lib/db/schema";
import { Env } from "@/lib/env";
import { Expense, useExpenses } from "@/lib/expenses";
import { Group, useGroup, useMe, getMe } from "@/lib/groups";
import { getLocale } from "@/lib/locale";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { SectionList, Share, View } from "react-native";

interface ExpenseSection {
  title: string;
  data: Expense[];
}

const ExpenseItem = (props: { group: Group; expense: Expense }) => {
  const { group, expense } = props;
  const router = useRouter();

  return (
    <Card
      key={expense.id}
      onPress={() =>
        router.navigate(`/protected/groups/${group.id}/expenses/${expense.id}`)
      }
    >
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
            {expense.payerName}, {expense.createdAt.toLocaleDateString()}
          </Text>
        </View>

        <Text>
          {expense.splitExpense.total.setLocale(getLocale()).toFormat()}
        </Text>
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

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    } else {
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  const sections = React.useMemo(() => {
    const sections: Record<string, Expense[]> = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.createdAt);
      const formattedDate = formatDate(date);

      if (!sections[formattedDate]) {
        sections[formattedDate] = [];
      }
      sections[formattedDate].push(expense);
    });

    return Object.entries(sections).map(([date, ids]) => ({
      title: date,
      data: ids,
    }));
  }, [expenses]);

  const renderItem = ({ item }: { item: Expense }) => (
    <ExpenseItem group={group} expense={item} />
  );

  const renderSectionHeader = ({ section }: { section: ExpenseSection }) => (
    <Text style={{ fontWeight: "bold" }}>{section.title}</Text>
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);

    try {
      await system.syncEngine.syncTableFromRemote(tables.expenses);
    } catch {
      snackBar.show(
        "Une erreur est survenue lors de la synchronisation des dépenses.",
        "error",
      );
    } finally {
      setRefreshing(false);
    }
  }, [system, snackBar]);

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
      ListEmptyComponent={<Text>Aucune dépense</Text>}
      showsVerticalScrollIndicator={false}
    />
  );
});

const BalanceDisplay = React.memo(function BalanceDisplay(props: {
  group: Group;
}) {
  const { group } = props;
  const balance = useBalance(group);
  const me = useMe(group.id);

  const myBalance = balance[me];

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
      <Text type="title">{getBalanceMessage(myBalance)}</Text>
      {myBalance.isZero() ? null : (
        <Text type="title" style={{ color: getAmountColor(myBalance) }}>
          {getAbsoluteAmount(myBalance).setLocale(getLocale()).toFormat()}
        </Text>
      )}
      <Button
        onPress={() => router.navigate(`/protected/groups/${group.id}/balance`)}
        style={{ marginTop: 8 }}
      >
        Remboursements
      </Button>
    </View>
  );
});

const GroupScreen = React.memo(function GroupScreen() {
  const router = useRouter();
  const { groupId }: { groupId: string } = useLocalSearchParams();
  const group = useGroup(groupId);
  const system = useSystem();

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
      title: `Rejoins le groupe "${group.name}" sur Splitzy !`,
      message: `Hey ! Je t'invite à rejoindre mon groupe "${group.name}" sur Splitzy pour gérer nos dépenses partagées. Clique sur ce lien pour nous rejoindre !\n\n${link}`,
    });
  }, [group]);

  if (!group) {
    throw new Error("Group not found");
  }

  if (getMe(system, groupId) === null) {
    return <Redirect href={`/protected/groups/${groupId}/set-me`} />;
  }

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <TopBar
        title={group.name}
        rightActions={[
          <Pressable
            testID="share-group"
            key="share"
            style={{
              backgroundColor: "white",
              padding: 8,
              borderRadius: 24,
            }}
            onPress={shareGroup}
            android_ripple={{ color: "hsl(0 0% 90%)" }}
          >
            <Ionicons name="share-outline" size={24} color="hsl(0 0% 40%)" />
          </Pressable>,
        ]}
      />

      <BalanceDisplay group={group} />

      <Expenses group={group} />

      <FAB
        onPress={() =>
          router.navigate(`/protected/groups/${group.id}/new-expense`)
        }
      >
        <Ionicons name="add-outline" size={24} color="white" />
      </FAB>
    </Screen>
  );
});

export default GroupScreen;
