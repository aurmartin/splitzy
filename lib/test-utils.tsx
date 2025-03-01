import { SystemProvider } from "@/components/system-provider";
import { Database, tables } from "@/lib/db/schema";
import { render, type RenderOptions } from "@testing-library/react-native";
import BetterSqliteDatabase from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  RenderRouterOptions,
  renderRouter,
  type MockContextConfig,
} from "expo-router/testing-library";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import React, { type ReactElement } from "react";
import { System } from "./system";
import * as jws from "jws";

const AllTheProviders = ({
  children,
  system,
}: {
  children: ReactElement;
  system: System;
}) => {
  return <SystemProvider system={system}>{children}</SystemProvider>;
};

const customRender = (
  ui: ReactElement,
  system: System,
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

export * from "@testing-library/react-native";
export {
  clearDatabase,
  createDatabase,
  createSupabaseServer,
  customRender as render,
  customRenderRouter as renderRouter,
  setFakeSession,
  generateAccessToken,
};
