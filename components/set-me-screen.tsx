import Button from "@/components/button";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TopBar } from "@/components/top-bar";
import { Group } from "@/lib/groups";
import Picker from "@/components/picker";
import { Picker as RNPicker } from "@react-native-picker/picker";
import React from "react";
import { View } from "react-native";

interface SetMeScreenProps {
  group: Group;
  onClose: (me: string) => void;
}

export function SetMeScreen({ group, onClose }: SetMeScreenProps) {
  const [selectedMember, setSelectedMember] = React.useState<string>(
    group.members[0],
  );

  const handleSubmit = React.useCallback(() => {
    if (selectedMember) {
      onClose(selectedMember);
    }
  }, [selectedMember, onClose]);

  return (
    <Screen>
      <TopBar title="Welcome" />

      <View style={{ flex: 1, gap: 24 }}>
        <View>
          <Text type="title" style={{ marginBottom: 8 }}>
            Welcome to {group.name}!
          </Text>
          <Text>Please select who you are in this group:</Text>
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

        <Button onPress={handleSubmit}>That's me!</Button>
      </View>
    </Screen>
  );
}
