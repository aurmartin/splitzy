import { ExpenseRecord, GroupRecord, tables } from "@/lib/db/schema";
import { system } from "@/lib/test-setup";
import {
  buildExpenseRecord,
  buildGroupRecord,
  waitFor,
} from "@/lib/test-utils";
import { generateId } from "@/lib/utils";
import { expect } from "@jest/globals";
import { type RealtimePostgresChangesPayload } from "@/lib/supabase-connector";

const buildOperationRecordFromEntity = (
  type: "insert" | "update" | "delete",
  table: "groups" | "expenses",
  entity: GroupRecord | ExpenseRecord,
) => ({
  id: generateId(),
  operationType: type,
  entityTable: table,
  entityId: entity.id,
  changes: JSON.stringify(entity),
  createdAt: new Date().toISOString(),
});

const buildRealtimeMessage = (
  eventType: "INSERT" | "UPDATE" | "DELETE",
  table: "groups" | "expenses",
  entity: GroupRecord | ExpenseRecord,
): RealtimePostgresChangesPayload<any> => ({
  eventType,
  new: entity,
  old: eventType === "DELETE" ? entity : {},
  schema: "public",
  table,
  commit_timestamp: new Date().toISOString(),
  errors: [],
});

describe("init", () => {
  it("should pull data from supabase and insert it into the database", async () => {
    // Setup
    const remoteGroup = buildGroupRecord();

    (system.supabaseConnector.selectAll as jest.Mock).mockResolvedValueOnce({
      data: [remoteGroup],
      error: null,
    });

    // Act
    await system.syncEngine.init();

    // Assert
    const afterGroups = system.db.select().from(tables.groups).all();

    expect(afterGroups.length).toBe(1);
    expect(afterGroups[0].id).toBe(remoteGroup.id);
    expect(afterGroups[0].name).toBe(remoteGroup.name);
    expect(afterGroups[0].currency).toBe(remoteGroup.currency);
    expect(afterGroups[0].members).toBe(remoteGroup.members);
    expect(afterGroups[0].createdAt).toBe(remoteGroup.createdAt);
    expect(afterGroups[0].updatedAt).toBe(remoteGroup.updatedAt);
    expect(afterGroups[0].deletedAt).toBe(remoteGroup.deletedAt);
  });
});

describe("syncTableFromRemote", () => {
  it("should insert remote entities that don't exist locally", async () => {
    // Setup
    const remoteGroup = buildGroupRecord();

    // Mock selectAll to return the remoteGroup
    (system.supabaseConnector.selectAll as jest.Mock).mockResolvedValueOnce({
      data: [remoteGroup],
      error: null,
    });

    // Act
    await system.syncEngine.syncTableFromRemote(tables.groups);

    // Assert
    const afterGroups = system.db.select().from(tables.groups).all();

    expect(afterGroups.length).toBe(1);
    expect(afterGroups[0].id).toBe(remoteGroup.id);
  });

  it("should update remote entities that exist locally", async () => {
    // Setup
    const remoteGroup = buildGroupRecord({ name: "remote group name" });
    const localGroup = { ...remoteGroup, name: "local group name" };

    // Mock selectAll to return the remoteGroup
    (system.supabaseConnector.selectAll as jest.Mock).mockResolvedValueOnce({
      data: [remoteGroup],
      error: null,
    });

    await system.db.insert(tables.groups).values(localGroup);

    // Assert setup
    const beforeGroups = system.db.select().from(tables.groups).all();
    expect(beforeGroups.length).toBe(1);
    expect(beforeGroups[0].name).toBe(localGroup.name);

    // Act
    await system.syncEngine.syncTableFromRemote(tables.groups);

    // Assert
    const afterGroups = system.db.select().from(tables.groups).all();
    expect(afterGroups.length).toBe(1);
    expect(afterGroups[0].id).toBe(remoteGroup.id);
    expect(afterGroups[0].name).toBe(remoteGroup.name);
  });

  it("should delete local entities that don't exist remotely", async () => {
    // Setup
    const localGroup = buildGroupRecord();

    // Mock selectAll to return an empty array
    (system.supabaseConnector.selectAll as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await system.db.insert(tables.groups).values(localGroup);

    // Assert setup
    const beforeGroups = system.db.select().from(tables.groups).all();
    expect(beforeGroups.length).toBe(1);
    expect(beforeGroups[0].id).toBe(localGroup.id);

    // Act
    await system.syncEngine.syncTableFromRemote(tables.groups);

    // Assert
    const afterGroups = system.db.select().from(tables.groups).all();
    expect(afterGroups.length).toBe(0);
  });

  it("should merge local update operations with remote entities", async () => {
    // Setup
    const remoteGroup = buildGroupRecord({ name: "remote group name" });
    const localGroup = { ...remoteGroup, name: "local group name" };

    // Mock selectAll to return the remoteGroup
    (system.supabaseConnector.selectAll as jest.Mock).mockResolvedValueOnce({
      data: [remoteGroup],
      error: null,
    });

    await system.db.insert(tables.groups).values(localGroup);

    // Assert setup
    const beforeGroups = system.db.select().from(tables.groups).all();
    expect(beforeGroups.length).toBe(1);
    expect(beforeGroups[0].name).toBe(localGroup.name);

    // Act
    await system.db.insert(tables.syncQueue).values({
      id: generateId(),
      operationType: "update",
      entityTable: "groups",
      entityId: remoteGroup.id,
      changes: JSON.stringify({ name: "local group name" }),
      createdAt: new Date().toISOString(),
    });

    await system.syncEngine.syncTableFromRemote(tables.groups);

    // Assert
    const afterGroups = system.db.select().from(tables.groups).all();
    expect(afterGroups.length).toBe(1);
    expect(afterGroups[0].id).toBe(remoteGroup.id);
    expect(afterGroups[0].name).toBe(localGroup.name);
  });

  it("should merge local delete operations with remote entities", async () => {
    // Setup
    const remoteGroup = buildGroupRecord();

    // Mock selectAll to return an empty array
    (system.supabaseConnector.selectAll as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });

    // Act
    await system.db.insert(tables.syncQueue).values({
      id: generateId(),
      operationType: "delete",
      entityTable: "groups",
      entityId: remoteGroup.id,
      createdAt: new Date().toISOString(),
    });

    await system.syncEngine.syncTableFromRemote(tables.groups);

    // Assert
    const afterGroups = system.db.select().from(tables.groups).all();
    expect(afterGroups.length).toBe(0);
  });
});

describe("processLocalOperations", () => {
  it("should handle inserting and updating the same entity", async () => {
    // Setup
    const initialGroup = buildGroupRecord({ name: "initial group name" });
    await system.db
      .insert(tables.syncQueue)
      .values(buildOperationRecordFromEntity("insert", "groups", initialGroup));

    const updatedGroup = { ...initialGroup, name: "updated group name" };
    await system.db
      .insert(tables.syncQueue)
      .values(buildOperationRecordFromEntity("update", "groups", updatedGroup));

    // Act
    await system.syncEngine.processLocalOperations();

    // Assert
    expect(system.supabaseConnector.insert).toHaveBeenCalledWith(
      "groups",
      initialGroup,
    );
    expect(system.supabaseConnector.update).toHaveBeenCalledWith(
      "groups",
      initialGroup.id,
      updatedGroup,
    );
  });
});

describe("realtime updates", () => {
  it("should handle insert operations", async () => {
    await system.syncEngine.init();

    const remoteExpense = buildExpenseRecord();
    const message = buildRealtimeMessage("INSERT", "expenses", remoteExpense);
    system.supabaseConnector.handleRealtimeMessage("expenses", message);

    await waitFor(() => {
      const expenses = system.db.select().from(tables.expenses).all();
      expect(expenses.length).toBe(1);
      expect(expenses[0].id).toBe(remoteExpense.id);
    });
  });

  it("should handle update operations", async () => {
    await system.syncEngine.init();

    const initialExpense = buildExpenseRecord({
      title: "initial expense title",
    });
    await system.db.insert(tables.expenses).values(initialExpense);

    const updatedExpense = {
      ...initialExpense,
      title: "updated expense title",
    };
    const message = buildRealtimeMessage("UPDATE", "expenses", updatedExpense);
    system.supabaseConnector.handleRealtimeMessage("expenses", message);

    await waitFor(() => {
      const expenses = system.db.select().from(tables.expenses).all();
      expect(expenses.length).toBe(1);
      expect(expenses[0].id).toBe(updatedExpense.id);
      expect(expenses[0].title).toBe(updatedExpense.title);
    });
  });

  it("should handle delete operations", async () => {
    await system.syncEngine.init();

    const initialExpense = buildExpenseRecord();
    await system.db.insert(tables.expenses).values(initialExpense);

    const message = buildRealtimeMessage("DELETE", "expenses", initialExpense);
    system.supabaseConnector.handleRealtimeMessage("expenses", message);

    await waitFor(() => {
      const expenses = system.db.select().from(tables.expenses).all();
      expect(expenses.length).toBe(0);
    });
  });
});
