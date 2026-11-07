import { SnackBarProvider } from "@/components/snack-bar";
import { SystemProvider } from "@/components/system-provider";
import { Database, tables } from "@/lib/db/schema";
import { System } from "@/lib/system";
import { render, type RenderOptions } from "@testing-library/react-native";
import BetterSqliteDatabase from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  RenderRouterOptions,
  renderRouter,
  type MockContextConfig,
} from "expo-router/testing-library";
import React, { type ReactElement } from "react";

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
  return drizzle(db, { schema: tables });
};

const clearDatabase = (db: Database) => {
  db.delete(tables.groups).run();
  db.delete(tables.expenses).run();
  db.delete(tables.syncQueue).run();
};

export * from "@testing-library/react-native";
export {
  clearDatabase,
  createDatabase,
  customRender as render,
  customRenderRouter as renderRouter,
};
