import { SnackBarProvider } from "@/components/snack-bar";
import { SystemProvider } from "@/components/system-provider";
import { Database, ExpenseRecord, GroupRecord, tables } from "@/lib/db/schema";
import { System } from "@/lib/system";
import { generateId } from "@/lib/utils";
import { render, type RenderOptions } from "@testing-library/react-native";
import BetterSqliteDatabase from "better-sqlite3";
import dinero from "dinero.js";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  RenderRouterOptions,
  renderRouter,
  type MockContextConfig,
} from "expo-router/testing-library";
import * as jws from "jws";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import React, { type ReactElement } from "react";
import { EqualSplit } from "./expenses";

const AllTheProviders = ({
  children,
  system,
}: {
  children: ReactElement;
  system: System | null;
}) => {
  return (
    <SnackBarProvider>
      {system !== null ? (
        <SystemProvider system={system}>{children}</SystemProvider>
      ) : (
        children
      )}
    </SnackBarProvider>
  );
};

const customRender = (
  ui: ReactElement,
  system: System | null,
  options?: Omit<RenderOptions, "wrapper">,
) => {
  const wrapper = ({ children }: { children: ReactElement }) => (
    <AllTheProviders system={system}>{children}</AllTheProviders>
  );

  return render(ui, { wrapper, ...options });
};

const customRenderRouter = (
  context: MockContextConfig,
  system: System,
  options?: Omit<RenderRouterOptions, "wrapper">,
) => {
  const wrapper = ({ children }: { children: ReactElement }) => (
    <AllTheProviders system={system}>{children}</AllTheProviders>
  );

  return renderRouter(context, { ...options, wrapper });
};

const createDatabase = () => {
  const db = new BetterSqliteDatabase(":memory:");
  return drizzle(db);
};

const clearDatabase = (db: Database) => {
  db.delete(tables.groups).run();
  db.delete(tables.expenses).run();
  db.delete(tables.syncQueue).run();
};

const createSupabaseServer = () =>
  setupServer(
    http.get("http://localhost:50001/rest/v1/groups", () =>
      HttpResponse.json([]),
    ),
    http.get("http://localhost:50001/rest/v1/expenses", () =>
      HttpResponse.json([]),
    ),
    http.post("http://localhost:50001/rest/v1/expenses", () =>
      HttpResponse.json({}),
    ),
    http.patch("http://localhost:50001/rest/v1/expenses", () =>
      HttpResponse.json({}),
    ),
    http.delete("http://localhost:50001/rest/v1/expenses", () =>
      HttpResponse.json({}),
    ),
    http.post("http://localhost:50001/auth/v1/otp", () =>
      HttpResponse.json({}),
    ),
    http.get("http://localhost:50001/auth/v1/user", () =>
      HttpResponse.json({
        id: "test-user-id",
        email: "test@test.com",
        confirmation_sent_at: "2025-03-01T00:00:00Z",
        created_at: "2025-03-01T00:00:00Z",
        updated_at: "2025-03-01T00:00:00Z",
      }),
    ),
    http.post("http://localhost:50000/parse-receipt", () =>
      HttpResponse.json({
        items: [],
        currency: "USD",
        date: "2025-03-01",
        title: "Test receipt",
      }),
    ),
  );

const setFakeSession = (system: System) => {
  const access_token = generateAccessToken();
  const refresh_token = "fake-refresh-token";

  system.setSession({ access_token, refresh_token });
};

const generateAccessToken = () => {
  const nowTimestamp = Math.floor(Date.now() / 1000);
  const expiresAt = nowTimestamp + 60 * 60 * 24 * 30; // 30 days

  const payload = {
    exp: expiresAt,
    iat: nowTimestamp,
    email: "test@test.com",
  };

  return jws.sign({
    header: { alg: "HS256" },
    payload,
    secret: "secret",
  });
};

const buildEqualSplit = (): EqualSplit => {
  return {
    type: "equal",
    total: dinero({ amount: 100, currency: "USD" }),
    members: ["Alice", "Bob"],
  };
};

const buildGroupRecord = (
  overrides: Partial<GroupRecord> = {},
): GroupRecord => {
  return {
    id: generateId(),
    name: "test group name",
    currency: "USD",
    members: JSON.stringify(["Alice", "Bob"]),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };
};

const buildExpenseRecord = (
  overrides: Partial<ExpenseRecord> = {},
): ExpenseRecord => {
  return {
    id: generateId(),
    groupId: generateId(),
    title: "test expense title",
    payerName: "Alice",
    splitExpense: JSON.stringify(buildEqualSplit()),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    receipt: null,
    ...overrides,
  };
};

export * from "@testing-library/react-native";
export {
  buildExpenseRecord,
  buildGroupRecord,
  clearDatabase,
  createDatabase,
  createSupabaseServer,
  generateAccessToken,
  customRender as render,
  customRenderRouter as renderRouter,
  setFakeSession,
};
