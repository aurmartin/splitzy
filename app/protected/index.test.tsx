import { Text } from "@/components/text";
import { groupsTable } from "@/lib/db/schema";
import { system } from "@/lib/test-setup";
import { buildGroupRecord, createGroup } from "@/lib/test-factories";
import { renderRouter } from "@/lib/test-utils";
import { fireEvent, screen, userEvent } from "@testing-library/react-native";
import GroupsScreen from ".";

const routerContext = {
  "/protected": () => <GroupsScreen />,
  "/protected/groups/:id": () => <Text>Group Details</Text>,
  "/protected/groups/new": () => <Text>New Group</Text>,
};

describe("GroupsScreen", () => {
  it("should render snapshot", async () => {
    await renderRouter(routerContext, system, { initialUrl: "/protected" });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("should render correct title", async () => {
    await renderRouter(routerContext, system, { initialUrl: "/protected" });

    screen.getByText("Splitzy Dev");
  });

  it("should render groups", async () => {
    createGroup(system, { name: "Group 1", members: ["Alice", "Bob"] });

    await renderRouter(routerContext, system, { initialUrl: "/protected" });

    screen.getByText("Group 1");
    screen.getByText("Alice, Bob");
  });

  it("should render no members message", async () => {
    createGroup(system, { members: [] });

    await renderRouter(routerContext, system, { initialUrl: "/protected" });

    screen.getByText("(no members)");
  });

  it("should render empty state", async () => {
    await renderRouter(routerContext, system, { initialUrl: "/protected" });
    screen.getByText("No groups found. Create one using the '+' button!");
  });

  it("should allow the user to refresh the groups", async () => {
    const group = buildGroupRecord({ name: "initial group name" });
    (system.supabaseConnector.selectAll as jest.Mock).mockResolvedValueOnce({
      data: [group],
      error: null,
    });
    await system.syncEngine.syncTableFromRemote(groupsTable);

    await renderRouter(routerContext, system, { initialUrl: "/protected" });

    screen.getByText("initial group name");

    const updatedGroup = { ...group, name: "updated group name" };
    (system.supabaseConnector.selectAll as jest.Mock).mockResolvedValueOnce({
      data: [updatedGroup],
      error: null,
    });

    await fireEvent(screen.getByTestId("groups-flat-list"), "onRefresh");

    await screen.findByText("updated group name");
  });

  it("should navigate to the new group screen", async () => {
    const user = userEvent.setup();

    await renderRouter(routerContext, system, { initialUrl: "/protected" });
    await user.press(screen.getByTestId("fab-button"));

    screen.getByText("New Group");
  });

  it("should navigate to the group details screen", async () => {
    const user = userEvent.setup();
    const group = createGroup(system);

    await renderRouter(routerContext, system, { initialUrl: "/protected" });
    await user.press(screen.getByText(group.name));

    screen.getByText("Group Details");
  });
});
