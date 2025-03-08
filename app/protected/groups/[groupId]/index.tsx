import Button from "@/components/button";
import Card from "@/components/card";
import FAB from "@/components/fab";
import { Screen } from "@/components/screen";
import { useSystem } from "@/components/system-provider";
import { Text } from "@/components/text";
import { useBalance } from "@/lib/balance";
import {
  getAbsoluteAmount,
  getAmountColor,
  getBalanceMessage,
} from "@/lib/currency";
import { tables } from "@/lib/db/schema";
import { Env } from "@/lib/env";
import { Expense, useExpenses } from "@/lib/expenses";
import { Group, useGroup, useMe } from "@/lib/groups";
import { getLocale } from "@/lib/locale";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, SectionList, Share, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";

interface ExpenseSection {
  title: string;
  data: Expense[];
}

const ExpenseItem = (props: { group: Group; expense: Expense }) => {
  const { group, expense } = props;
  const router = useRouter();

  if (!expense) {
    throw new Error("Expense not found");
  }

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

const Expenses = React.memo(function _Expenses(props: { group: Group }) {
  const { group } = props;
  const expenses = useExpenses(group.id);
  const system = useSystem();
  const [refreshing, setRefreshing] = React.useState(false);

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
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

  return (
    <SectionList
      contentContainerStyle={{ gap: 8 }}
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      maxToRenderPerBatch={10}
      initialNumToRender={10}
      windowSize={10}
      onRefresh={async () => {
        setRefreshing(true);
        await system.syncEngine.syncTableFromRemote(tables.expenses);
        setRefreshing(false);
      }}
      refreshing={refreshing}
    />
  );
});

const BalanceDisplay = React.memo(function _BalanceDisplay(props: {
  group: Group;
}) {
  const { group } = props;
  const balance = useBalance(group);
  const me = useMe(group.id);

  if (!me) {
    throw new Error("Me not found");
  }

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

const GroupScreen = React.memo(function _GroupScreen() {
  const router = useRouter();
  const { groupId }: { groupId: string } = useLocalSearchParams();
  const group = useGroup(groupId);
  const me = useMe(groupId);

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
    return <ActivityIndicator />;
  }

  if (!me) {
    return <Redirect href={`/protected/groups/${groupId}/set-me`} />;
  }

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Pressable
          style={{ backgroundColor: "white", padding: 8, borderRadius: 24 }}
          onPress={() => router.navigate("/protected")}
          android_ripple={{}}
        >
          <Ionicons name="home-outline" size={24} color="hsl(0 0% 40%)" />
        </Pressable>

        <Text type="display" style={{ marginLeft: 16 }}>
          {group.name}
        </Text>

        <Pressable
          style={{
            backgroundColor: "white",
            padding: 8,
            borderRadius: 24,
            marginLeft: "auto",
          }}
          onPress={shareGroup}
          android_ripple={{}}
        >
          <Ionicons name="share-outline" size={24} color="hsl(0 0% 40%)" />
        </Pressable>
      </View>

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
