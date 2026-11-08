import NewGroupScreen from "@/app/protected/groups/new";
import { groupsTable } from "@/lib/db/schema";
import { system } from "@/lib/test-setup";
import { renderRouter } from "@/lib/test-utils";
import { fireEvent, screen, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";

const routerContext = {
  "/protected/index": () => <Text>Group list</Text>,
  "/protected/groups/new": () => <NewGroupScreen />,
};

const renderNewGroup = () => renderRouter(routerContext, system, { initialUrl: "/protected/groups/new" });

const fillAndSave = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByPlaceholderText("Name"), "Tokyo");
  await user.type(screen.getByPlaceholderText("New member"), "Alice");
  await user.press(screen.getByLabelText("Save"));
};

describe("NewGroupScreen", () => {
  it("creates the group in the device's currency by default", async () => {
    const user = userEvent.setup();
    await renderNewGroup();

    await fillAndSave(user);

    expect(
      system.db
        .select()
        .from(groupsTable)
        .all()
        .map((group) => group.currency),
    ).toEqual(["USD"]);
  });

  it("creates the group in the chosen currency", async () => {
    const user = userEvent.setup();
    await renderNewGroup();

    fireEvent(screen.getByTestId("currency-picker"), "valueChange", "JPY");
    await fillAndSave(user);

    expect(
      system.db
        .select()
        .from(groupsTable)
        .all()
        .map((group) => group.currency),
    ).toEqual(["JPY"]);
  });
});
