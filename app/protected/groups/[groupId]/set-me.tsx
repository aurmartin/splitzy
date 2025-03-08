import Button from "@/components/button";
import Picker from "@/components/picker";
import { Screen } from "@/components/screen";
import { useSystem } from "@/components/system-provider";
import { Text } from "@/components/text";
import { TopBar } from "@/components/top-bar";
import { Group, useGroup, setMe } from "@/lib/groups";
import { Picker as RNPicker } from "@react-native-picker/picker";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { View } from "react-native";

function SetMeForm(props: { group: Group }) {
  const { group } = props;
  const system = useSystem();

  const [selectedMember, setSelectedMember] = React.useState<string>(
    group.members[0],
  );

  const handleSubmit = React.useCallback(() => {
    if (selectedMember) {
      setMe(system, group.id, selectedMember);
      router.replace(`/protected/groups/${group.id}`);
    }
  }, [selectedMember, group.id, system]);

  return (
    <View style={{ flex: 1, gap: 24 }}>
      <View>
        <Text type="title" style={{ marginBottom: 8 }}>
          Bienvenue dans {group.name}!
        </Text>
        <Text>Veuillez sélectionner qui vous êtes dans ce groupe:</Text>
      </View>

      <View style={{ backgroundColor: "white", borderRadius: 8 }}>
        <Picker
          selectedValue={selectedMember}
          onValueChange={(value) => setSelectedMember(value)}
        >
          {group.members.map((member) => (
            <RNPicker.Item key={member} label={member} value={member} />
          ))}
        </Picker>
      </View>

      <Button onPress={handleSubmit}>C'est moi!</Button>
    </View>
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
      <TopBar title="Welcome" />
      <SetMeForm group={group} />
    </Screen>
  );
}

export default SetMeScreen;
