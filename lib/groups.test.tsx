import { tables } from "@/lib/db/schema";
import { DisplayableError } from "@/lib/displayable-error";
import {
  deleteGroup,
  getGroupRow,
  getMe,
  leaveGroup,
  updateGroup,
  useGroups,
} from "@/lib/groups";
import { system } from "@/lib/test-setup";
import {
  buildEqualSplit,
  buildGroup,
  createExpense,
  createGroup,
} from "@/lib/test-factories";
import { render, screen } from "@/lib/test-utils";
import { eq } from "drizzle-orm";
import { Text } from "react-native";

const group = buildGroup({ name: "Trip", members: ["Alice", "Bob"] });
const groupId = group.id;

const queuedOperations = () =>
  system.db
    .select()
    .from(tables.syncQueue)
    .where(eq(tables.syncQueue.entityId, groupId))
    .all();

beforeEach(() => {
  createGroup(system, group, { me: "Alice" });
});

describe("updateGroup", () => {
  it("renames the group and adds members", async () => {
    await updateGroup(system, groupId, {
      name: "  Road trip ",
      members: ["Alice", "Bob", " Charlie ", ""],
    });

    const group = getGroupRow(system, groupId)!;
    expect(group.name).toBe("Road trip");
    expect(group.members).toEqual(["Alice", "Bob", "Charlie"]);

    const [operation] = queuedOperations();
    expect(operation.operationType).toBe("update");
    expect(JSON.parse(operation.changes!)).toMatchObject({
      name: "Road trip",
      members: JSON.stringify(["Alice", "Bob", "Charlie"]),
    });
  });

  it("removes a member no expense refers to", async () => {
    await updateGroup(system, groupId, { name: "Trip", members: ["Alice"] });

    expect(getGroupRow(system, groupId)!.members).toEqual(["Alice"]);
  });

  it.each([
    [{ name: " ", members: ["Alice"] }, "Veuillez entrer un nom"],
    [{ name: "Trip", members: [""] }, "Veuillez entrer au moins un membre"],
    [
      { name: "Trip", members: ["Alice", "Bob", "bob"] },
      "bob fait déjà partie du groupe",
    ],
    [
      { name: "Trip", members: ["Bob"] },
      "Vous ne pouvez pas vous retirer vous-même. Quittez le groupe à la place.",
    ],
  ])("refuses %j", async (params, message) => {
    await expect(updateGroup(system, groupId, params)).rejects.toEqual(
      expect.objectContaining({ message }),
    );

    expect(getGroupRow(system, groupId)!.members).toEqual(["Alice", "Bob"]);
    expect(queuedOperations()).toEqual([]);
  });

  it.each([
    ["the payer", "Bob", ["Alice"]],
    ["a participant", "Alice", ["Alice", "Bob"]],
  ])(
    "refuses to remove %s of an expense",
    async (_role, payerName, splitMembers) => {
      createExpense(system, group, {
        payerName,
        splitExpense: buildEqualSplit(group, 1000, splitMembers),
      });

      await expect(
        updateGroup(system, groupId, { name: "Trip", members: ["Alice"] }),
      ).rejects.toEqual(
        new DisplayableError(
          "Impossible de retirer ce membre",
          "Bob apparaît dans des dépenses du groupe. Supprimez-les d'abord.",
        ),
      );

      expect(getGroupRow(system, groupId)!.members).toEqual(["Alice", "Bob"]);
    },
  );
});

describe("deleteGroup", () => {
  it("soft deletes the group and hides it from the group list", async () => {
    createGroup(system, { name: "Other group" });

    await deleteGroup(system, groupId);

    expect(getGroupRow(system, groupId)!.deletedAt).toBeInstanceOf(Date);
    expect(getMe(system, groupId)).toBeNull();

    const [operation] = queuedOperations();
    expect(operation.operationType).toBe("update");
    expect(JSON.parse(operation.changes!).deletedAt).toEqual(
      expect.any(String),
    );

    const GroupNames = () => (
      <Text>
        {useGroups()
          .map((group) => group.name)
          .join(", ")}
      </Text>
    );
    await render(<GroupNames />, system);
    screen.getByText("Other group");
  });
});

describe("leaveGroup", () => {
  it("removes the membership, then the local group and its expenses", async () => {
    createExpense(system, group);

    await leaveGroup(system, groupId);

    expect(system.supabaseConnector.leaveGroup).toHaveBeenCalledWith(groupId);
    // Supabase no longer returns the group (mocked as empty): the sync
    // deletes the local rows.
    expect(getGroupRow(system, groupId)).toBeUndefined();
    expect(system.db.select().from(tables.expenses).all()).toEqual([]);
    expect(getMe(system, groupId)).toBeNull();
  });

  it("keeps the group when Supabase refuses", async () => {
    (system.supabaseConnector.leaveGroup as jest.Mock).mockResolvedValueOnce({
      error: { message: "Network request failed" },
    });

    await expect(leaveGroup(system, groupId)).rejects.toEqual({
      message: "Network request failed",
    });

    expect(getGroupRow(system, groupId)).toBeDefined();
    expect(getMe(system, groupId)).toBe("Alice");
  });
});
