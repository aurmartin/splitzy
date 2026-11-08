import Button from "@/components/button";
import { confirm } from "@/components/confirm";
import Label from "@/components/label";
import { ListGroup } from "@/components/list-group";
import { Screen } from "@/components/screen";
import { useSnackBar } from "@/components/snack-bar";
import { useSystem } from "@/components/system-provider";
import { Text } from "@/components/text";
import { TextInput } from "@/components/text-input";
import { TopBar } from "@/components/top-bar";
import { TopBarSaveAction } from "@/components/top-bar-action";
import { DisplayableError } from "@/lib/displayable-error";
import { useExpenses } from "@/lib/expenses";
import { deleteGroup, getMe, getMembersInExpenses, leaveGroup, updateGroup, useGroup, type Group } from "@/lib/groups";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, View } from "react-native";

const iconColor = "hsl(0 0% 50%)";

function GroupSettingsForm({ group }: { group: Group }) {
  const system = useSystem();
  const snackBar = useSnackBar();
  const expenses = useExpenses(group.id);
  const { t } = useTranslation();

  const [name, setName] = React.useState(group.name);
  // Existing members can only be removed: expenses refer to them by name.
  const [members, setMembers] = React.useState(group.members);
  const [newMembers, setNewMembers] = React.useState<string[]>([]);

  const me = getMe(system, group.id);
  const membersInExpenses = React.useMemo(() => getMembersInExpenses(expenses), [expenses]);

  const removeMember = (member: string) => {
    if (member === me) {
      Alert.alert(t("validation.cannotRemoveMember"), t("validation.cannotRemoveSelf"));
      return;
    }

    if (membersInExpenses.has(member)) {
      Alert.alert(t("validation.cannotRemoveMember"), t("validation.memberInExpenses", { member }));
      return;
    }

    setMembers(members.filter((m) => m !== member));
  };

  const changeNewMember = (index: number, member: string) => {
    setNewMembers(newMembers.map((m, i) => (i === index ? member : m)));
  };

  const removeNewMember = (index: number) => {
    setNewMembers(newMembers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      await updateGroup(system, group.id, {
        name,
        members: [...members, ...newMembers],
      });

      router.back();
      snackBar.show(t("groupSettings.updated"), "success");
    } catch (error) {
      if (error instanceof DisplayableError) {
        Alert.alert(error.title, error.message);
      } else {
        console.error("Update group error", error);
        snackBar.show(t("common.error"), "error");
      }
    }
  };

  const handleLeave = async () => {
    const confirmed = await confirm({
      title: t("groupSettings.leaveTitle"),
      message: t("groupSettings.leaveMessage"),
      confirmText: t("groupSettings.leaveConfirm"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await leaveGroup(system, group.id);

      router.dismissTo("/protected");
      snackBar.show(t("groupSettings.left"), "success");
    } catch (error) {
      console.error("Leave group error", error);
      snackBar.show(t("groupSettings.leaveError"), "error");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: t("groupSettings.deleteTitle"),
      message: t("groupSettings.deleteMessage"),
      confirmText: t("common.delete"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteGroup(system, group.id);

      router.dismissTo("/protected");
      snackBar.show(t("groupSettings.deleted"), "success");
    } catch (error) {
      console.error("Delete group error", error);
      snackBar.show(t("common.error"), "error");
    }
  };

  return (
    <Screen>
      <TopBar title={t("groupSettings.title")} rightActions={<TopBarSaveAction key="save" onPress={handleSave} />} />

      <ScrollView showsVerticalScrollIndicator={false} alwaysBounceVertical={false}>
        <Label>{t("common.name")}</Label>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t("common.name")}
          accessibilityLabel={t("groupSettings.nameLabel")}
        />

        <Label style={{ marginTop: 16 }}>{t("common.members")}</Label>
        <ListGroup>
          {[
            ...members.map((member) => (
              <View key={`member-${member}`}>
                <Text style={{ flex: 1 }}>{member === me ? t("groupSettings.memberMe", { member }) : member}</Text>
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={iconColor}
                  accessibilityLabel={t("groupSettings.removeMember", { member })}
                  onPress={() => removeMember(member)}
                />
              </View>
            )),
            ...newMembers.map((member, index) => (
              <TextInput
                key={`new-member-${index}`}
                value={member}
                placeholder={t("common.newMember")}
                accessibilityLabel={t("common.newMember")}
                autoFocus
                onChangeText={(text) => changeNewMember(index, text)}
                right={
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={iconColor}
                    accessibilityLabel={t("groupSettings.cancelAdd")}
                    onPress={() => removeNewMember(index)}
                  />
                }
              />
            )),
          ]}
        </ListGroup>

        <Button onPress={() => setNewMembers([...newMembers, ""])} type="secondary" style={{ marginTop: 8 }}>
          {t("common.addMember")}
        </Button>

        <View style={{ marginTop: 32, gap: 8 }}>
          <Button type="destructive" onPress={handleLeave}>
            {t("groupSettings.leave")}
          </Button>
          <Button type="destructive" onPress={handleDelete}>
            {t("groupSettings.delete")}
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

export default function GroupSettingsScreen() {
  const { groupId }: { groupId: string } = useLocalSearchParams();
  const group = useGroup(groupId);

  // Leaving removes the group while this screen is still open.
  if (!group) {
    return null;
  }

  return <GroupSettingsForm group={group} />;
}
