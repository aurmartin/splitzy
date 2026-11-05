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
import {
  deleteGroup,
  getMe,
  getMembersInExpenses,
  leaveGroup,
  updateGroup,
  useGroup,
  type Group,
} from "@/lib/groups";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, ScrollView, View } from "react-native";

const iconColor = "hsl(0 0% 50%)";

function GroupSettingsForm({ group }: { group: Group }) {
  const system = useSystem();
  const snackBar = useSnackBar();
  const expenses = useExpenses(group.id);

  const [name, setName] = React.useState(group.name);
  // Existing members can only be removed: expenses refer to them by name.
  const [members, setMembers] = React.useState(group.members);
  const [newMembers, setNewMembers] = React.useState<string[]>([]);

  const me = getMe(system, group.id);
  const membersInExpenses = React.useMemo(
    () => getMembersInExpenses(expenses),
    [expenses],
  );

  const removeMember = (member: string) => {
    if (member === me) {
      Alert.alert(
        "Impossible de retirer ce membre",
        "Vous ne pouvez pas vous retirer vous-même. Quittez le groupe à la place.",
      );
      return;
    }

    if (membersInExpenses.has(member)) {
      Alert.alert(
        "Impossible de retirer ce membre",
        `${member} apparaît dans des dépenses du groupe. Supprimez-les d'abord.`,
      );
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
      snackBar.show("Groupe modifié", "success");
    } catch (error) {
      if (error instanceof DisplayableError) {
        Alert.alert(error.title, error.message);
      } else {
        console.error("Update group error", error);
        snackBar.show("Une erreur est survenue", "error");
      }
    }
  };

  const handleLeave = async () => {
    const confirmed = await confirm({
      title: "Quitter le groupe ?",
      message:
        "Le groupe et ses dépenses seront retirés de cet appareil. Les autres membres les gardent, et un lien d'invitation permet de revenir.",
      confirmText: "Quitter",
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await leaveGroup(system, group.id);

      router.dismissTo("/protected");
      snackBar.show("Vous avez quitté le groupe", "success");
    } catch (error) {
      console.error("Leave group error", error);
      snackBar.show(
        "Impossible de quitter le groupe. Vérifiez votre connexion.",
        "error",
      );
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Supprimer le groupe ?",
      message:
        "Le groupe et toutes ses dépenses seront supprimés pour tous les membres.",
      confirmText: "Supprimer",
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteGroup(system, group.id);

      router.dismissTo("/protected");
      snackBar.show("Groupe supprimé", "success");
    } catch (error) {
      console.error("Delete group error", error);
      snackBar.show("Une erreur est survenue", "error");
    }
  };

  return (
    <Screen>
      <TopBar
        title="Paramètres du groupe"
        rightActions={<TopBarSaveAction key="save" onPress={handleSave} />}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
      >
        <Label>Nom</Label>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nom"
          accessibilityLabel="Nom du groupe"
        />

        <Label style={{ marginTop: 16 }}>Membres</Label>
        <ListGroup>
          {[
            ...members.map((member) => (
              <View key={`member-${member}`}>
                <Text style={{ flex: 1 }}>
                  {member}
                  {member === me ? " (moi)" : ""}
                </Text>
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={iconColor}
                  accessibilityLabel={`Retirer ${member}`}
                  onPress={() => removeMember(member)}
                />
              </View>
            )),
            ...newMembers.map((member, index) => (
              <TextInput
                key={`new-member-${index}`}
                value={member}
                placeholder="Nouveau membre"
                accessibilityLabel="Nouveau membre"
                autoFocus
                onChangeText={(text) => changeNewMember(index, text)}
                right={
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={iconColor}
                    accessibilityLabel="Annuler l'ajout"
                    onPress={() => removeNewMember(index)}
                  />
                }
              />
            )),
          ]}
        </ListGroup>

        <Button
          onPress={() => setNewMembers([...newMembers, ""])}
          type="secondary"
          style={{ marginTop: 8 }}
        >
          Ajouter un membre
        </Button>

        <View style={{ marginTop: 32, gap: 8 }}>
          <Button type="destructive" onPress={handleLeave}>
            Quitter le groupe
          </Button>
          <Button type="destructive" onPress={handleDelete}>
            Supprimer le groupe
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
