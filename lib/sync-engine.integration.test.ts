import { syncQueue, tables } from "@/lib/db/schema";
import { ExpensesRepository } from "@/lib/expenses/repository";
import { encodeGroup, getGroupRow } from "@/lib/groups";
import { admin, createTestUser, type TestUser } from "@/lib/integration-test-setup";
import { createTestExpenses, createTestGroup, renameGroup, signIn, waitUntil } from "@/lib/integration-test-utils";
import { System } from "@/lib/system";
import { buildExpense, buildGroup } from "@/lib/test-factories";
import { createDatabase } from "@/lib/test-utils";

jest.unmock("@/lib/supabase-connector");

describe("SyncEngine", () => {
  let user: TestUser;
  let system: System;

  const waitForEmptyQueue = async () => {
    if (!(await waitUntil(() => system.db.select().from(syncQueue).all().length === 0, 5000))) {
      throw new Error("The sync queue was never emptied");
    }
  };

  beforeEach(async () => {
    user = await createTestUser();
    system = new System(createDatabase());
    await system.initializeMigrations();
    await system.setSession(await signIn(user));
  });

  afterEach(async () => {
    await system.dispose();
  });

  it("pushes local changes to Supabase", async () => {
    const group = buildGroup();
    const expense = buildExpense(group);

    await system.syncEngine.insert(tables.groups, group.id, encodeGroup(group));
    await ExpensesRepository.insertExpense(system, expense);
    await waitForEmptyQueue();

    const { data: groups } = await admin.from("groups").select().eq("id", group.id);
    const { data: expenses } = await admin.from("expenses").select().eq("id", expense.id);
    expect(groups).toEqual([expect.objectContaining({ name: group.name, createdBy: user.id })]);
    expect(expenses).toEqual([expect.objectContaining({ title: expense.title, groupId: group.id })]);
  });

  it("pulls Supabase rows into the local database", async () => {
    const group = await createTestGroup(user);
    const [expense] = await createTestExpenses(group);

    await system.syncEngine.syncAllTablesFromRemote();

    expect(getGroupRow(system, group.id)).toEqual(group);
    expect(ExpensesRepository.getExpense(system, expense.id)).toEqual(expense);
  });

  it("applies changes made in Supabase without a refresh", async () => {
    const group = await createTestGroup(user);

    await system.syncEngine.init();

    let applied = false;
    for (let attempt = 0; attempt < 20 && !applied; attempt++) {
      const name = await renameGroup(group.id);
      applied = await waitUntil(() => getGroupRow(system, group.id)?.name === name, 500);
    }

    expect(applied).toBe(true);
  });

  it("drops a change that Supabase refuses", async () => {
    const otherGroup = await createTestGroup(await createTestUser());
    const expense = buildExpense(otherGroup);

    await ExpensesRepository.insertExpense(system, expense);
    await waitForEmptyQueue();

    expect(ExpensesRepository.getExpense(system, expense.id)).toBeNull();
    const { data: expenses } = await admin.from("expenses").select().eq("id", expense.id);
    expect(expenses).toEqual([]);
  });
});
