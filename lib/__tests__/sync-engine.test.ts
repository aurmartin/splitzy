import { tables } from "@/lib/db/schema";
import { System } from "@/lib/system";
import {
  clearDatabase,
  createDatabase,
  createSupabaseServer,
} from "@/lib/test-utils";
import { generateId } from "@/lib/utils";
import { expect } from "@jest/globals";
import { HttpResponse, http } from "msw";

// Mock server setup
const server = createSupabaseServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let system: System;

beforeEach(async () => {
  system = new System(createDatabase());
  system.initializeMigrations();
  clearDatabase(system.db);
  server.resetHandlers();
});

afterEach(async () => {
  if (system) {
    await system.dispose();
  }
});

const createRemoteGroup = (overrides: Record<string, any> = {}) => ({
  id: generateId(),
  name: "group name",
  currency: "USD",
  members: "[]",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
  ...overrides,
});

describe("init", () => {
  it("should pull data from supabase and insert it into the database", async () => {
    // Setup
    const remoteGroup = createRemoteGroup();

    server.use(
      http.get("http://localhost:50001/rest/v1/groups", () =>
        HttpResponse.json([remoteGroup]),
      ),
    );

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
    const remoteGroup = createRemoteGroup();

    server.use(
      http.get("http://localhost:50001/rest/v1/groups", () =>
        HttpResponse.json([remoteGroup]),
      ),
    );

    // Act
    await system.syncEngine.syncTableFromRemote(tables.groups);

    // Assert
    const afterGroups = system.db.select().from(tables.groups).all();

    expect(afterGroups.length).toBe(1);
    expect(afterGroups[0].id).toBe(remoteGroup.id);
  });

  it("should update remote entities that exist locally", async () => {
    // Setup
    const remoteGroup = createRemoteGroup({ name: "remote group name" });
    const localGroup = { ...remoteGroup, name: "local group name" };

    server.use(
      http.get("http://localhost:50001/rest/v1/groups", () =>
        HttpResponse.json([remoteGroup]),
      ),
    );

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
    const localGroup = createRemoteGroup();

    server.use(
      http.get("http://localhost:50001/rest/v1/groups", () =>
        HttpResponse.json([]),
      ),
    );

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
    const remoteGroup = createRemoteGroup({ name: "remote group name" });
    const localGroup = { ...remoteGroup, name: "local group name" };

    server.use(
      http.get("http://localhost:50001/rest/v1/groups", () =>
        HttpResponse.json([remoteGroup]),
      ),
    );

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
    const remoteGroup = createRemoteGroup();

    server.use(
      http.get("http://localhost:50001/rest/v1/groups", () =>
        HttpResponse.json([remoteGroup]),
      ),
    );

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

  it("should merge local insert operations with remote entities", async () => {
    // Setup
    const localGroup = createRemoteGroup();

    server.use(
      http.get("http://localhost:50001/rest/v1/groups", () =>
        HttpResponse.json([]),
      ),
    );

    // Act
    await system.db.insert(tables.syncQueue).values({
      id: generateId(),
      operationType: "insert",
      entityTable: "groups",
      entityId: localGroup.id,
      changes: JSON.stringify(localGroup),
      createdAt: new Date().toISOString(),
    });

    await system.syncEngine.syncTableFromRemote(tables.groups);

    // Assert
    const afterGroups = system.db.select().from(tables.groups).all();
    expect(afterGroups.length).toBe(1);
    expect(afterGroups[0].id).toBe(localGroup.id);
  });
});
