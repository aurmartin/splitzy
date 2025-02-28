import Button from "@/components/button";
import Label from "@/components/label";
import TextInput from "@/components/text-input";
import { useAddGroup } from "@/lib/groups";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { ValidationError } from "@/lib/validation-error";
import { Screen } from "@/components/screen";
import { TopBar } from "@/components/top-bar";
import { Text } from "@/components/text";

const DEFAULT_CURRENCY = "EUR";

type PromiseState = {
  loading: boolean;
  validationErrors?: Record<string, string>;
  error?: string;
};

type Action =
  | { type: "start" }
  | { type: "validationError"; payload: Record<string, string> }
  | { type: "error"; payload: string }
  | { type: "success" };

function promiseStateReducer(_state: PromiseState, action: Action) {
  switch (action.type) {
    case "start":
      return { loading: true };
    case "validationError":
      return { loading: false, validationErrors: action.payload };
    case "error":
      return { loading: false, error: action.payload };
    case "success":
      return { loading: false };
  }
}

const GroupForm = () => {
  const router = useRouter();
  const addGroup = useAddGroup();

  const [name, setName] = React.useState("");
  const [members, setMembers] = React.useState<string[]>([""]);

  const [promiseState, dispatch] = React.useReducer(promiseStateReducer, {
    loading: false,
  });

  const handleSubmit = async () => {
    try {
      dispatch({ type: "start" });

      await addGroup({ name, currency: DEFAULT_CURRENCY, members });

      dispatch({ type: "success" });

      router.navigate("/");
    } catch (error) {
      if (error instanceof ValidationError) {
        dispatch({ type: "validationError", payload: error.errors });
      } else {
        console.error("Error adding group", error);

        const errorMessage =
          error instanceof Error ? error.message : "Une erreur est survenue";

        dispatch({ type: "error", payload: errorMessage });
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
      <TopBar title="Nouveau groupe" />

      <View style={{ flex: 1, gap: 16 }}>
        {promiseState.error && (
          <Text style={{ color: "hsl(0, 100%, 30%)" }}>
            {promiseState.error}
          </Text>
        )}

        <View>
          <TextInput
            value={name}
            onChangeText={setName}
            label="Nom du groupe"
            placeholder="Nom du groupe"
          />
          {promiseState.validationErrors?.name && (
            <Text style={{ color: "hsl(0, 100%, 30%)" }}>
              {promiseState.validationErrors.name}
            </Text>
          )}
        </View>

        <View>
          <Label>Membres</Label>
          <View
            style={{
              gap: 8,
              borderRadius: 4,
            }}
          >
            {members.map((member, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <TextInput
                  style={{ flex: 1 }}
                  value={member}
                  onChangeText={(text) => changeMember(index, text)}
                  placeholder="Nouveau membre"
                />

                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={index === 0 ? "hsl(0 0% 50%)" : "black"}
                  onPress={() => removeMember(index)}
                />
              </View>
            ))}
            <Button onPress={addMember} type="secondary">
              Ajouter un membre
            </Button>
          </View>
          {promiseState.validationErrors?.members && (
            <Text style={{ color: "hsl(0, 100%, 30%)" }}>
              {promiseState.validationErrors.members}
            </Text>
          )}
        </View>

        <Button onPress={handleSubmit} style={{ marginTop: 16 }}>
          Créer le groupe
        </Button>
      </View>
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
