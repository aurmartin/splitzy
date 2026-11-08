import type { Session } from "@supabase/supabase-js";
import type { Group } from "@/lib/groups";
import { admin, createTestUser, type TestUser } from "@/lib/integration-test-setup";
import { createTestExpenses, createTestGroup, renameGroup, signIn, waitUntil } from "@/lib/integration-test-utils";
import type { OperationType, RemoteOperation } from "@/lib/operation";
import { SupabaseConnector } from "@/lib/supabase-connector";
import type { System } from "@/lib/system";
import { buildGroupRecord } from "@/lib/test-factories";

jest.unmock("@/lib/supabase-connector");

const SESSION_STORAGE_KEY = "supabase.auth.token";

const connectors: SupabaseConnector[] = [];

afterEach(async () => {
  await Promise.all(connectors.splice(0).map((connector) => connector.stopRealtime()));
});

const createMemoryStorage = () => {
  const items = new Map<string, string>();

  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
};

const createConnector = (session?: Session) => {
  const kvStorage = createMemoryStorage();

  if (session) {
    kvStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  const connector = new SupabaseConnector({ kvStorage } as unknown as System);
  connectors.push(connector);

  return connector;
};

const recordRealtimeEvents = (connector: SupabaseConnector) => {
  const events: RemoteOperation[] = [];

  connector.addRealtimeEventListener("groups", (operation) => events.push(operation));
  connector.addRealtimeEventListener("expenses", (operation) => events.push(operation));

  return events;
};

const waitForEvent = async (events: RemoteOperation[], entityId: string, operationType: OperationType) => {
  const isExpected = (event: RemoteOperation) => event.entityId === entityId && event.operationType === operationType;

  if (!(await waitUntil(() => events.some(isExpected), 5000))) {
    throw new Error(`No realtime ${operationType} received for ${entityId}`);
  }

  return events.find(isExpected)!;
};

const waitForChannels = async (events: RemoteOperation[], groupId: string) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    await renameGroup(groupId);

    if (await waitUntil(() => events.some((event) => event.entityId === groupId), 500)) {
      events.length = 0;
      return;
    }
  }

  throw new Error(`Realtime channels never delivered changes to group ${groupId}`);
};

const sortedIds = (rows: { id: string }[]) => rows.map(({ id }) => id).sort();

describe("SupabaseConnector", () => {
  let user: TestUser;
  let otherUser: TestUser;
  let group: Group;
  let otherGroup: Group;
  let connector: SupabaseConnector;
  let events: RemoteOperation[];

  beforeEach(async () => {
    [user, otherUser] = await Promise.all([createTestUser(), createTestUser()]);
    [group, otherGroup] = await Promise.all([createTestGroup(user), createTestGroup(otherUser)]);
    connector = createConnector(await signIn(user));
    events = recordRealtimeEvents(connector);
  });

  const receivedIds = () => events.map(({ entityId }) => entityId);

  describe("selectAll", () => {
    it("returns the rows of every page", async () => {
      const expenses = await createTestExpenses(group, 5);

      const { data, error } = await connector.selectAll("expenses", 2);

      expect(error).toBeNull();
      expect(sortedIds(data!)).toEqual(sortedIds(expenses));
    });

    it("only returns the rows of the user's groups", async () => {
      const { data } = await connector.selectAll("groups");

      expect(sortedIds(data!)).toEqual([group.id]);
    });
  });

  describe("writes", () => {
    it("creates, updates and deletes a group", async () => {
      const record = buildGroupRecord({ name: "Created" });
      const { id } = record;

      expect((await connector.insert("groups", record)).error).toBeNull();
      expect((await connector.selectSingle("groups", id)).data).toMatchObject({ name: "Created", createdBy: user.id });

      expect((await connector.update("groups", id, { name: "Updated" })).error).toBeNull();
      expect((await connector.selectSingle("groups", id)).data).toMatchObject({ name: "Updated" });

      expect((await connector.delete("groups", id)).error).toBeNull();
      expect((await connector.selectSingle("groups", id)).data).toBeNull();
    });

    it("leaves a group, which hides it from the user", async () => {
      const { error } = await connector.leaveGroup(group.id);

      expect(error).toBeNull();
      expect((await connector.selectSingle("groups", group.id)).data).toBeNull();
      const { data: memberships } = await admin.from("members").select().eq("group_id", group.id);
      expect(memberships).toEqual([]);
    });
  });

  describe("realtime", () => {
    it("receives changes once the user signs in after startup", async () => {
      const signedOutConnector = createConnector();
      const signedOutEvents = recordRealtimeEvents(signedOutConnector);

      signedOutConnector.startRealtime();
      await signedOutConnector.setSession(await signIn(user));

      await waitForChannels(signedOutEvents, group.id);
    });

    describe("with a session persisted before startup", () => {
      beforeEach(async () => {
        connector.startRealtime();
        await waitForChannels(events, group.id);
      });

      it("receives changes to the user's groups and expenses", async () => {
        await renameGroup(group.id);
        const [expense] = await createTestExpenses(group);
        await admin.from("expenses").update({ title: "Updated title" }).eq("id", expense.id);

        expect(await waitForEvent(events, group.id, "update")).toMatchObject({ entityTable: "groups" });
        expect(await waitForEvent(events, expense.id, "insert")).toMatchObject({ entityTable: "expenses" });
        expect(await waitForEvent(events, expense.id, "update")).toMatchObject({
          changes: expect.objectContaining({ title: "Updated title" }),
        });
      });

      it("doesn't receive changes to other users' groups", async () => {
        await renameGroup(otherGroup.id);
        await renameGroup(group.id);
        await waitForEvent(events, group.id, "update");

        expect(receivedIds()).not.toContain(otherGroup.id);
      });

      it("follows the signed-in user when the session changes", async () => {
        await connector.setSession(await signIn(otherUser));
        await waitForChannels(events, otherGroup.id);

        await renameGroup(group.id);
        await renameGroup(otherGroup.id);
        await waitForEvent(events, otherGroup.id, "update");

        expect(receivedIds()).not.toContain(group.id);
      });

      it("receives deletes of other users' groups", async () => {
        await admin.from("groups").delete().eq("id", otherGroup.id);

        await waitForEvent(events, otherGroup.id, "delete");
      });

      it("stops receiving changes once stopped", async () => {
        await connector.stopRealtime();
        await renameGroup(group.id);

        expect(await waitUntil(() => events.length > 0, 1000)).toBe(false);
      });
    });
  });
});
