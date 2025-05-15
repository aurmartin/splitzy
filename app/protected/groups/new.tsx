import Button from "@/components/button";
import Label from "@/components/label";
import { ListGroup } from "@/components/list-group";
import { Screen } from "@/components/screen";
import { TextInput } from "@/components/text-input";
import { TopBar } from "@/components/top-bar";
import { TopBarSaveAction } from "@/components/top-bar-action";
import { useAddGroup } from "@/lib/groups";
import { ValidationError } from "@/lib/validation-error";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, View } from "react-native";

const DEFAULT_CURRENCY = "EUR";

const GroupForm = () => {
  const router = useRouter();
  const addGroup = useAddGroup();

  const [name, setName] = React.useState("");
  const [members, setMembers] = React.useState<string[]>([""]);

  const handleSubmit = async () => {
    try {
      await addGroup({ name, currency: DEFAULT_CURRENCY, members });

      router.navigate("/");
    } catch (error) {
      if (error instanceof ValidationError) {
        if (error.errors.name) {
          Alert.alert("Le nom est invalide", error.errors.name);
        } else if (error.errors.members) {
          Alert.alert("Les membres sont invalides", error.errors.members);
        }
      } else {
        console.error("Error adding group", error);

        const errorMessage =
          error instanceof Error ? error.message : "Une erreur est survenue";

        Alert.alert("Une erreur est survenue", errorMessage);
      }
    }
  };

  const addMember = () => {
    setMembers([...members, ""]);
  };

  const changeMember = (index: number, member: string) => {
    setMembers(members.map((m, i) => (i === index ? member : m)));
  };

  const removeMember = (index: number) => {
    if (index === 0) return;
    setMembers(members.filter((_, i) => i !== index));
  };

  return (
    <Screen>
      <TopBar
        title="Créer un groupe"
        rightActions={<TopBarSaveAction key="create" onPress={handleSubmit} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
      >
        <TextInput value={name} onChangeText={setName} placeholder="Nom" />

        <Label style={{ marginTop: 16 }}>Membres</Label>
        <ListGroup>
          {members.map((member, index) => (
            <TextInput
              key={index}
              value={member}
              placeholder="Nouveau membre"
              onChangeText={(text) => changeMember(index, text)}
              right={
                index > 0 && (
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color="hsl(0 0% 50%)"
                    onPress={() => removeMember(index)}
                  />
                )
              }
            />
          ))}
        </ListGroup>

        <Button onPress={addMember} type="secondary" style={{ marginTop: 8 }}>
          Ajouter un membre
        </Button>
      </ScrollView>
    </Screen>
  );
};

export default function NewGroupScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: "New Group" }} />
      <GroupForm />
    </View>
  );
}
