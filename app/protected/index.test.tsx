import { Text } from "@/components/text";
import { groupsTable } from "@/lib/db/schema";
import { server, system } from "@/lib/test-setup";
import { buildGroupRecord, renderRouter } from "@/lib/test-utils";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { HttpResponse, http } from "msw";
import GroupsScreen from ".";

const routerContext = {
  "/protected": () => <GroupsScreen />,
  "/protected/groups/:id": () => <Text>Group Details</Text>,
  "/protected/groups/new": () => <Text>New Group</Text>,
};

describe("GroupsScreen", () => {
  it("should render snapshot", () => {
    renderRouter(routerContext, system, { initialUrl: "/protected" });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("should render correct title", () => {
    renderRouter(routerContext, system, { initialUrl: "/protected" });
    expect(screen.getByText("Splitzy Dev"));
  });

  it("should render groups", async () => {
    // Setup
    const group = buildGroupRecord({
      name: "Group 1",
      members: JSON.stringify(["Alice", "Bob"]),
    });
    await system.db.insert(groupsTable).values(group);

    // Act
    renderRouter(routerContext, system, { initialUrl: "/protected" });

    // Assert
    expect(screen.getByText("Group 1"));
    expect(screen.getByText("Alice, Bob"));
  });

  it("should render no members message", async () => {
    // Setup
    const group = buildGroupRecord({ members: JSON.stringify([]) });
    await system.db.insert(groupsTable).values(group);
    // Act
    renderRouter(routerContext, system, { initialUrl: "/protected" });
    // Assert
    expect(screen.getByText("(no members)"));
  });

  it("should render empty state", () => {
    renderRouter(routerContext, system, { initialUrl: "/protected" });
    expect(
      screen.getByText("No groups found. Create one by using the '+' button!"),
    );
  });

  it("should allow the user to refresh the groups", async () => {
    // Setup
    const group = buildGroupRecord({ name: "initial group name" });
    server.use(
      http.get("http://localhost:50001/rest/v1/groups", () =>
        HttpResponse.json([group]),
      ),
    );
    await system.syncEngine.syncTableFromRemote(groupsTable);
    // Act
    renderRouter(routerContext, system, {
      initialUrl: "/protected",
      // Don't know why but concurrency breaks test triggering flatlist refresh
      concurrentRoot: false,
    });
    // Assert
    expect(screen.getByText("initial group name"));
    // Setup - Update the group on the server
    const updatedGroup = { ...group, name: "updated group name" };
    server.use(
      http.get("http://localhost:50001/rest/v1/groups", () =>
        HttpResponse.json([updatedGroup]),
      ),
    );
    // Act - User refresh
    const flatList = screen.getByTestId("groups-flat-list");
    await act(() => flatList.props.refreshControl.props.onRefresh());
    // Assert
    expect(screen.getByText("updated group name"));
  });

  it("should navigate to the new group screen", async () => {
    renderRouter(routerContext, system, { initialUrl: "/protected" });
    fireEvent.press(screen.getByTestId("fab-button"));
    expect(screen.getByText("New Group"));
  });

  it("should navigate to the group details screen", async () => {
    const group = buildGroupRecord();
    await system.db.insert(groupsTable).values(buildGroupRecord());

    renderRouter(routerContext, system, { initialUrl: "/protected" });
    fireEvent.press(screen.getByText(group.name));

    expect(screen.getByText("Group Details"));
  });
});
