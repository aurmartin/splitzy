import { type RunResult } from "better-sqlite3";
import { type ExtractTablesWithRelations } from "drizzle-orm";
import { type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import {
  SQLiteColumnBuilderBase,
  SQLiteTransaction,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { type SQLiteRunResult } from "expo-sqlite";

export const schemaMigrationsTable = sqliteTable("schema_migrations", {
  version: integer().primaryKey(),
  appliedAt: text().notNull(),
});

export const groupsTable = sqliteTable("groups", {
  id: text().primaryKey(),
  name: text().notNull(),
  currency: text().notNull(),
  members: text().notNull(),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
  deletedAt: text(),
});

export const expensesTable = sqliteTable("expenses", {
  id: text().primaryKey(),
  groupId: text().notNull(),
  title: text().notNull(),
  payerName: text().notNull(),
  splitExpense: text().notNull(),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
  deletedAt: text(),
  receipt: text(),
});

export const syncedTable = (
  name: string,
  columns: Record<string, SQLiteColumnBuilderBase>,
) => {
  return sqliteTable(name, {
    ...columns,
    id: text().primaryKey(),
  });
};

export type SyncableTable = ReturnType<typeof syncedTable>;

export const syncQueue = sqliteTable("sync_queue", {
  id: text().primaryKey(),
  operationType: text().notNull(),
  entityTable: text().notNull(),
  entityId: text().notNull(),
  changes: text(),
  createdAt: text().notNull(),
});

export const tables = {
  groups: groupsTable,
  expenses: expensesTable,
  syncQueue: syncQueue,
};

export type ExpenseRecord = typeof expensesTable.$inferSelect;
export type GroupRecord = typeof groupsTable.$inferSelect;
export type SyncQueueRecord = typeof syncQueue.$inferSelect;

export type Transaction = SQLiteTransaction<
  "sync",
  SQLiteRunResult | RunResult,
  Record<string, unknown>,
  ExtractTablesWithRelations<Record<string, unknown>>
>;

export type Database = ExpoSQLiteDatabase | BetterSQLite3Database;
