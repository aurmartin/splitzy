import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { Env } from "@/lib/env";

jest.setTimeout(20_000);

const TEST_EMAIL_DOMAIN = "integration.splitzy.local";
const LEFTOVER_MIN_AGE_MS = 10 * 60 * 1000;

type TestUser = { id: string; email: string; password: string };

Object.defineProperty(globalThis, "fetch", {
  value: (globalThis as unknown as { nodeFetch: typeof fetch }).nodeFetch,
  configurable: true,
  writable: true,
});

const admin = createClient(Env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const createdUserIds: string[] = [];

const createTestUser = async (): Promise<TestUser> => {
  const email = `${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
  const password = randomUUID();

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    throw error;
  }

  createdUserIds.push(data.user.id);

  return { id: data.user.id, email, password };
};

const deleteUsersAndTheirGroups = async (userIds: string[]) => {
  if (userIds.length === 0) {
    return;
  }

  const { error } = await admin.from("groups").delete().in("createdBy", userIds);
  if (error) {
    throw error;
  }

  for (const userId of userIds) {
    const { error: userError } = await admin.auth.admin.deleteUser(userId);
    if (userError) {
      throw userError;
    }
  }
};

const deleteLeftovers = async () => {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    throw error;
  }

  const leftoverIds = data.users
    .filter((user) => user.email?.endsWith(`@${TEST_EMAIL_DOMAIN}`))
    .filter((user) => Date.now() - new Date(user.created_at).getTime() > LEFTOVER_MIN_AGE_MS)
    .map((user) => user.id);

  await deleteUsersAndTheirGroups(leftoverIds);
};

beforeAll(async () => {
  await deleteLeftovers();
});

afterAll(async () => {
  await deleteUsersAndTheirGroups(createdUserIds.splice(0));
});

export { admin, createTestUser };
export type { TestUser };
