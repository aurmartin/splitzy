import Card from "@/components/card";
import FAB from "@/components/fab";
import { useSystem } from "@/components/system-provider";
import { Text } from "@/components/text";
import { Colors } from "@/lib/constants";
import { tables } from "@/lib/db/schema";
import { Env } from "@/lib/env";
import { Group, useGroups } from "@/lib/groups";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GroupListItem = ({ group }: { group: Group }) => {
  const router = useRouter();

  const handlePress = React.useCallback(() => {
    router.push(`/protected/groups/${group.id}`);
  }, [group.id, router]);

  return (
    <Card key={group.id} onPress={handlePress}>
      <Text type="title">{group.name}</Text>
      <Text style={{ color: "#888" }}>
        {group.members.join(", ") || "(no members)"}
      </Text>
    </Card>
  );
};

const Groups = React.memo(function _Groups() {
  const groups = useGroups();
  const system = useSystem();
  const [refreshing, setRefreshing] = React.useState(false);

  const renderItem = React.useCallback(
    ({ item }: { item: Group }) => <GroupListItem group={item} />,
    [],
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await system.syncEngine.syncTableFromRemote(tables.groups);
    setRefreshing(false);
  }, [setRefreshing, system.syncEngine]);

  return (
    <FlatList
      data={groups}
      onRefresh={onRefresh}
      refreshing={refreshing}
      contentContainerStyle={{ gap: 8 }}
      renderItem={renderItem}
      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginVertical: 64 }}>
          No groups found. Create one by using the '+' button!
        </Text>
      }
    />
  );
});

const ScreenTitle = React.memo(function _ScreenTitle() {
  const title = React.useMemo(() => {
    if (Env.APP_ENV === "development") {
      return "Splitzy Dev";
    }
    if (Env.APP_ENV === "preview") {
      return "Splitzy Preview";
    }
    return "Splitzy";
  }, []);

  return (
    <Text type="display" style={{ marginTop: 16, marginBottom: 16 }}>
      {title}
    </Text>
  );
});

export default function GroupsScreen() {
  const router = useRouter();

  const onAddClick = React.useCallback(() => {
    router.navigate("/protected/groups/new");
  }, [router]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.background, padding: 8 }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenTitle />

      <Groups />

      <FAB onPress={onAddClick}>
        <Ionicons name="add-outline" size={24} color="white" />
      </FAB>
    </SafeAreaView>
  );
}
