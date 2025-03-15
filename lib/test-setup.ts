import { System } from "@/lib/system";
import {
  clearDatabase,
  createDatabase,
  createSupabaseServer,
} from "@/lib/test-utils";

const server = createSupabaseServer();
let system: System;

beforeEach(async () => {
  clearDatabase(system.db);
});

beforeAll(async () => {
  server.listen();
  system = new System(createDatabase());
  await system.initializeMigrations();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  system.dispose();
});

export { server, system };
