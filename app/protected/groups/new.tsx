import Button from "@/components/button";
import { CurrencyPicker } from "@/components/currency-picker";
import Label from "@/components/label";
import { ListGroup } from "@/components/list-group";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TextInput } from "@/components/text-input";
import { TopBar } from "@/components/top-bar";
import { TopBarSaveAction } from "@/components/top-bar-action";
import { getDeviceCurrency } from "@/lib/currency";
import { type Currency } from "@/lib/currency-codes";
import { useAddGroup } from "@/lib/groups";
import { ValidationError } from "@/lib/validation-error";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, View } from "react-native";

const GroupForm = () => {
  const router = useRouter();
  const addGroup = useAddGroup();
  const { t } = useTranslation();

  const [name, setName] = React.useState("");
  const [currency, setCurrency] = React.useState<Currency>(getDeviceCurrency);
  const [members, setMembers] = React.useState<string[]>([""]);

  const handleSubmit = async () => {
    try {
      await addGroup({ name, currency, members });

      router.navigate("/");
    } catch (error) {
      if (error instanceof ValidationError) {
        if (error.errors.name) {
          Alert.alert(t("validation.invalidName"), error.errors.name);
        } else if (error.errors.members) {
          Alert.alert(t("validation.invalidMembers"), error.errors.members);
        }
      } else {
        console.error("Error adding group", error);

        const errorMessage = error instanceof Error ? error.message : t("common.error");

        Alert.alert(t("common.error"), errorMessage);
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
      <TopBar title={t("newGroup.title")} rightActions={<TopBarSaveAction key="create" onPress={handleSubmit} />} />
      <ScrollView showsVerticalScrollIndicator={false} alwaysBounceVertical={false}>
        <TextInput value={name} onChangeText={setName} placeholder={t("common.name")} />

        <View style={{ marginTop: 8 }}>
          <CurrencyPicker value={currency} onChange={setCurrency} />
          <Text type="bodySmall" style={{ marginTop: 4, marginHorizontal: 16, color: "hsl(0 0% 40%)" }}>
            {t("newGroup.currencyHint")}
          </Text>
        </View>

        <Label style={{ marginTop: 16 }}>{t("common.members")}</Label>
        <ListGroup>
          {members.map((member, index) => (
            <TextInput
              key={index}
              value={member}
              placeholder={t("common.newMember")}
              onChangeText={(text) => changeMember(index, text)}
              right={
                index > 0 && (
                  <Ionicons name="trash-outline" size={20} color="hsl(0 0% 50%)" onPress={() => removeMember(index)} />
                )
              }
            />
          ))}
        </ListGroup>

        <Button onPress={addMember} type="secondary" style={{ marginTop: 8 }}>
          {t("common.addMember")}
        </Button>
      </ScrollView>
    </Screen>
  );
};

export default function NewGroupScreen() {
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: t("newGroup.screenTitle") }} />
      <GroupForm />
    </View>
  );
}
