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

    await user.clear(screen.getByLabelText("Group name"));
    await user.type(screen.getByLabelText("Group name"), "Road trip");
    await user.press(screen.getByText("Add a member"));
    await user.type(screen.getByLabelText("New member"), "Charlie");
    await user.press(screen.getByLabelText("Save"));

    const group = getGroupRow(system, groupId)!;
    expect(group.name).toBe("Road trip");
    expect(group.members).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("removes a member no expense refers to", async () => {
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByLabelText("Remove Bob"));
    expect(screen.queryByText("Bob")).toBeNull();
    await user.press(screen.getByLabelText("Save"));

    expect(getGroupRow(system, groupId)!.members).toEqual(["Alice"]);
  });

  it("explains why a member of an expense can't be removed", async () => {
    createExpense(system, group, { payerName: "Bob" });
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByLabelText("Remove Bob"));

    expect(alert).toHaveBeenCalledWith(
      "Can't remove this member",
      "Bob appears in the group's expenses. Delete them first.",
    );
    screen.getByText("Bob");
  });

  it("doesn't let the user remove themselves", async () => {
    const user = userEvent.setup();
    await renderSettings();

    screen.getByText("Alice (me)");
    await user.press(screen.getByLabelText("Remove Alice"));

    expect(alert).toHaveBeenCalledWith("Can't remove this member", expect.stringContaining("Leave the group"));
    screen.getByText("Alice (me)");
  });

  it("shows why a save is refused", async () => {
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByText("Add a member"));
    await user.type(screen.getByLabelText("New member"), "alice");
    await user.press(screen.getByLabelText("Save"));

    expect(alert).toHaveBeenCalledWith("Invalid members", "alice is already in the group");
    expect(getGroupRow(system, groupId)!.members).toEqual(["Alice", "Bob"]);
  });

  it("deletes the group once confirmed", async () => {
    answerAlert("Delete");
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByText("Delete the group"));

    await screen.findByText("Group list");
    expect(getGroupRow(system, groupId)!.deletedAt).toBeInstanceOf(Date);
  });

  it("keeps the group when the deletion is cancelled", async () => {
    answerAlert("Cancel");
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByText("Delete the group"));

    screen.getByText("Delete the group");
    expect(getGroupRow(system, groupId)!.deletedAt).toBeUndefined();
  });

  it("leaves the group once confirmed", async () => {
    answerAlert("Leave");
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByText("Leave the group"));

    await screen.findByText("Group list");
    expect(system.supabaseConnector.leaveGroup).toHaveBeenCalledWith(groupId);
    expect(getGroupRow(system, groupId)).toBeUndefined();
  });

  it("stays on the screen when leaving fails", async () => {
    answerAlert("Leave");
    (system.supabaseConnector.leaveGroup as jest.Mock).mockResolvedValueOnce({
      error: { message: "Network request failed" },
    });
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByText("Leave the group"));

    await screen.findByText("Couldn't leave the group. Check your connection.");
    expect(getGroupRow(system, groupId)).toBeDefined();
    expect(getMe(system, groupId)).toBe("Alice");
  });
});
