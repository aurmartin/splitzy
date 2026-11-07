import GroupSettingsScreen from "@/app/protected/groups/[groupId]/settings";
import { getGroupRow, getMe } from "@/lib/groups";
import { system } from "@/lib/test-setup";
import { buildGroup, createExpense, createGroup } from "@/lib/test-factories";
import { renderRouter } from "@/lib/test-utils";
import { screen, userEvent } from "@testing-library/react-native";
import { Alert, type AlertButton, Text } from "react-native";

const group = buildGroup({ name: "Trip", members: ["Alice", "Bob"] });
const groupId = group.id;

const alert = jest.spyOn(Alert, "alert");

// Answers the confirmation dialog by pressing the button with this text.
const answerAlert = (buttonText: string) =>
  alert.mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.text === buttonText)?.onPress?.();
  });

// Only reset these spies: restoring every mock would also undo the Supabase
// connector mocks, which are spies too.
afterEach(() => {
  alert.mockReset();
});

beforeEach(() => {
  createGroup(system, group, { me: "Alice" });
});

const routerContext = {
  "/protected/index": () => <Text>Group list</Text>,
  "/protected/groups/[groupId]/index": () => <Text>Group screen</Text>,
  "/protected/groups/[groupId]/settings": () => <GroupSettingsScreen />,
};

// Opens the settings from the group screen, so that saving can go back.
const renderSettings = () =>
  renderRouter(routerContext, system, {
    initialUrl: `/protected/groups/${groupId}/settings`,
  });

describe("GroupSettingsScreen", () => {
  it("renames the group and adds a member", async () => {
    const user = userEvent.setup();
    await renderSettings();

    await user.clear(screen.getByLabelText("Nom du groupe"));
    await user.type(screen.getByLabelText("Nom du groupe"), "Road trip");
    await user.press(screen.getByText("Ajouter un membre"));
    await user.type(screen.getByLabelText("Nouveau membre"), "Charlie");
    await user.press(screen.getByLabelText("Enregistrer"));

    const group = getGroupRow(system, groupId)!;
    expect(group.name).toBe("Road trip");
    expect(group.members).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("removes a member no expense refers to", async () => {
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByLabelText("Retirer Bob"));
    expect(screen.queryByText("Bob")).toBeNull();
    await user.press(screen.getByLabelText("Enregistrer"));

    expect(getGroupRow(system, groupId)!.members).toEqual(["Alice"]);
  });

  it("explains why a member of an expense can't be removed", async () => {
    createExpense(system, group, { payerName: "Bob" });
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByLabelText("Retirer Bob"));

    expect(alert).toHaveBeenCalledWith(
      "Impossible de retirer ce membre",
      "Bob apparaît dans des dépenses du groupe. Supprimez-les d'abord.",
    );
    screen.getByText("Bob");
  });

  it("doesn't let the user remove themselves", async () => {
    const user = userEvent.setup();
    await renderSettings();

    screen.getByText("Alice (moi)");
    await user.press(screen.getByLabelText("Retirer Alice"));

    expect(alert).toHaveBeenCalledWith("Impossible de retirer ce membre", expect.stringContaining("Quittez le groupe"));
    screen.getByText("Alice (moi)");
  });

  it("shows why a save is refused", async () => {
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByText("Ajouter un membre"));
    await user.type(screen.getByLabelText("Nouveau membre"), "alice");
    await user.press(screen.getByLabelText("Enregistrer"));

    expect(alert).toHaveBeenCalledWith("Les membres sont invalides", "alice fait déjà partie du groupe");
    expect(getGroupRow(system, groupId)!.members).toEqual(["Alice", "Bob"]);
  });

  it("deletes the group once confirmed", async () => {
    answerAlert("Supprimer");
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByText("Supprimer le groupe"));

    await screen.findByText("Group list");
    expect(getGroupRow(system, groupId)!.deletedAt).toBeInstanceOf(Date);
  });

  it("keeps the group when the deletion is cancelled", async () => {
    answerAlert("Annuler");
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByText("Supprimer le groupe"));

    screen.getByText("Supprimer le groupe");
    expect(getGroupRow(system, groupId)!.deletedAt).toBeUndefined();
  });

  it("leaves the group once confirmed", async () => {
    answerAlert("Quitter");
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByText("Quitter le groupe"));

    await screen.findByText("Group list");
    expect(system.supabaseConnector.leaveGroup).toHaveBeenCalledWith(groupId);
    expect(getGroupRow(system, groupId)).toBeUndefined();
  });

  it("stays on the screen when leaving fails", async () => {
    answerAlert("Quitter");
    (system.supabaseConnector.leaveGroup as jest.Mock).mockResolvedValueOnce({
      error: { message: "Network request failed" },
    });
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByText("Quitter le groupe"));

    await screen.findByText("Impossible de quitter le groupe. Vérifiez votre connexion.");
    expect(getGroupRow(system, groupId)).toBeDefined();
    expect(getMe(system, groupId)).toBe("Alice");
  });
});
