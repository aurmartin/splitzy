import { tables } from "@/lib/db/schema";
import { System } from "@/lib/system";
import {
  clearDatabase,
  createDatabase,
  createSupabaseServer,
} from "@/lib/test-utils";
import { expect } from "@jest/globals";
import { HttpResponse, http } from "msw";

// Mock server setup
const server = createSupabaseServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("sync engine initialization", () => {
  let system: System;

  beforeEach(async () => {
    system = new System(createDatabase());
    clearDatabase(system.db);
  });

  afterEach(async () => {
    if (system) {
      await system.dispose();
    }
  });

  it("should pull data from supabase and insert it into the database", async () => {
    // Verify database is empty before sync
    const beforeGroups = system.db.select().from(tables.groups).all();
    expect(beforeGroups.length).toBe(0);

    // Setup
    const supabaseGroup = {
      id: "1",
      name: "group name",
      currency: "USD",
      members: "[]",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      deletedAt: null,
    };

    server.use(
      http.get("http://localhost:50001/rest/v1/groups", () =>
        HttpResponse.json([supabaseGroup]),
      ),
    );

    // Act
    await system.syncEngine.init();

    // Assert
    const afterGroups = system.db.select().from(tables.groups).all();

    expect(afterGroups.length).toBe(1);
    expect(afterGroups[0].id).toBe(supabaseGroup.id);
    expect(afterGroups[0].name).toBe(supabaseGroup.name);
    expect(afterGroups[0].currency).toBe(supabaseGroup.currency);
    expect(afterGroups[0].members).toBe(supabaseGroup.members);
    expect(afterGroups[0].createdAt).toBe(supabaseGroup.createdAt);
    expect(afterGroups[0].updatedAt).toBe(supabaseGroup.updatedAt);
    expect(afterGroups[0].deletedAt).toBe(supabaseGroup.deletedAt);
  });
});
