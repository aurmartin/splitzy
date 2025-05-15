import { ListGroup } from "@/components/list-group";
import { Screen } from "@/components/screen";
import { useSystem } from "@/components/system-provider";
import { Text } from "@/components/text";
import { TopBar } from "@/components/top-bar";
import { Group, setMe, useGroup } from "@/lib/groups";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

function SetMeForm(props: { group: Group }) {
  const { group } = props;
  const system = useSystem();

  const handleSubmit = React.useCallback(
    (member: string) => {
      setMe(system, group.id, member);
      router.replace(`/protected/groups/${group.id}`);
    },
    [group.id, system],
  );

  return (
    <>
      <View style={{ marginBottom: 16 }}>
        <Text type="title" style={{ marginBottom: 8 }}>
          Bienvenue dans le groupe {group.name} ! 👋
        </Text>
        <Text>Dites-nous qui vous êtes dans ce groupe :</Text>
      </View>

      <ListGroup>
        {group.members.map((member) => (
          <Pressable key={member} onPress={() => handleSubmit(member)}>
            <Text>{member}</Text>
          </Pressable>
        ))}
      </ListGroup>
    </>
  );
}

function SetMeScreen() {
  const { groupId }: { groupId: string } = useLocalSearchParams();
  const group = useGroup(groupId);

  if (!group) {
    throw new Error("Group not found");
  }

  return (
    <Screen>
      <TopBar />
      <SetMeForm group={group} />
    </Screen>
  );
}

export default SetMeScreen;
