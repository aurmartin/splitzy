import { createClient, type Session } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { Env } from "@/lib/env";
import type { Expense } from "@/lib/expenses";
import { encodeExpense } from "@/lib/expenses/repository";
import { encodeGroup, type Group } from "@/lib/groups";
import { admin, type TestUser } from "@/lib/integration-test-setup";
import { buildExpense, buildGroup } from "@/lib/test-factories";

const signIn = async (user: TestUser): Promise<Session> => {
  const client = createClient(Env.SUPABASE_URL, Env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) {
    throw error;
  }

  return data.session;
};

const createTestGroup = async (user: TestUser, overrides: Partial<Group> = {}) => {
  const group = buildGroup(overrides);

  const { error: groupError } = await admin.from("groups").insert({ ...encodeGroup(group), createdBy: user.id });
  if (groupError) {
    throw groupError;
  }

  const { error: memberError } = await admin.from("members").insert({ user_id: user.id, group_id: group.id });
  if (memberError) {
    throw memberError;
  }

  return group;
};

const createTestExpenses = async (group: Group, count = 1, overrides: Partial<Expense> = {}) => {
  const expenses = Array.from({ length: count }, () => buildExpense(group, overrides));

  const { error } = await admin.from("expenses").insert(expenses.map(encodeExpense));
  if (error) {
    throw error;
  }

  return expenses;
};

const renameGroup = async (groupId: string) => {
  const name = `Renamed ${randomUUID()}`;

  const { error } = await admin.from("groups").update({ name }).eq("id", groupId);
  if (error) {
    throw error;
  }

  return name;
};

const waitUntil = async (predicate: () => boolean, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (predicate()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return predicate();
};

export { createTestExpenses, createTestGroup, renameGroup, signIn, waitUntil };
