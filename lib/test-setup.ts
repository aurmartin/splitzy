import { System } from "@/lib/system";
import { clearDatabase, createDatabase } from "@/lib/test-utils";

let system: System;

beforeEach(async () => {
  clearDatabase(system.db);
});

beforeAll(async () => {
  system = new System(createDatabase());
  await system.initializeMigrations();
});

afterAll(() => {
  system.dispose();
});

export { system };
