import { useSystem } from "@/components/system-provider";
import { ExpensesRepository } from "@/lib/expenses/repository";
import { getGroupRow, useAddGroup } from "@/lib/groups";
import { System } from "@/lib/system";
import { generateId } from "@/lib/utils";
import dinero from "dinero.js";
import { usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Platform, StyleSheet, Text, View } from "react-native";
import { type PercentageSplit } from "@/lib/expenses";

function getRandomMember(members: string[]) {
  return members[Math.floor(Math.random() * members.length)];
}

async function generateExpenses(system: System, groupId: string) {
  const count = 10;
  const group = getGroupRow(system, groupId);
  if (!group) {
    throw new Error("Group not found");
  }
  const members = group.members;

  for (let i = 0; i < count; i++) {
    const payer = getRandomMember(members);

    const total = dinero({
      amount: Math.floor(Math.random() * 100),
      currency: group.currency,
    });

    const splitExpense: PercentageSplit = {
      type: "percentage",
      total,
      members,
      ratios: members.reduce(
        (acc, member) => {
          acc[member] = Math.floor(Math.random() * 100);
          return acc;
        },
        {} as PercentageSplit["ratios"],
      ),
    };

    const id = generateId();
    const date = new Date();
    date.setDate(date.getDate() - i * 3);

    await ExpensesRepository.insertExpense(system, {
      id,
      groupId,
      title: `Expense ${i + 1}`,
      payerName: payer,
      splitExpense,
      createdAt: date,
      updatedAt: date,
      deletedAt: undefined,
      receipt: null,
    });
  }
}

const MemoryUsageInfo = () => {
  const [used, setUsed] = useState(0);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} bytes`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} Kb`;
    }
    return `${(bytes / 1024 / 1024).toFixed(2)} Mb`;
  };

  useEffect(() => {
    if (Platform.OS === "web") {
      const interval = setInterval(() => {
        setUsed((performance as any).memory.usedJSHeapSize);
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  return <Text style={{ marginBottom: 10 }}>Memory: {formatBytes(used)}</Text>;
};

export default function DevUi() {
  const pathname = usePathname();
  const isGroup = pathname.includes("/groups/");
  const groupId = isGroup ? pathname.split("/groups/")[1] : undefined;
  const system = useSystem();
  const addGroup = useAddGroup();
  const onGenerateExpenses = () => {
    if (!isGroup) {
      return;
    }
    generateExpenses(system, groupId!);
  };

  const onGenerateGroup = () => {
    addGroup({
      name: "Test Group",
      members: ["Alice", "Bob", "Charlie"],
      currency: "EUR",
    });
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <Text>Dev UI</Text>
        <MemoryUsageInfo />
        <Button
          title="Generate expenses"
          onPress={onGenerateExpenses}
          disabled={!isGroup}
        />
        <Button title="Generate group" onPress={onGenerateGroup} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  container: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    margin: 10,
    padding: 10,
    shadowColor: "black",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    gap: 10,
  },
});
