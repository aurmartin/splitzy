import { type RunResult } from "better-sqlite3";
import { type ExtractTablesWithRelations } from "drizzle-orm";
import { type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import {
  SQLiteColumnBuilderBase,
  SQLiteTransaction,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { type SQLiteRunResult } from "expo-sqlite";

export const groupsTable = sqliteTable("groups", {
  id: text().primaryKey(),
  syncStatus: text().notNull(),
  name: text().notNull(),
  currency: text().notNull(),
  members: text().notNull(),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
  deletedAt: text(),
});

export const expensesTable = sqliteTable("expenses", {
  id: text().primaryKey(),
  syncStatus: text().notNull(),
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
    syncStatus: text().notNull(),
  });
};

export type SyncableTable = ReturnType<typeof syncedTable>;

export const syncQueue = sqliteTable("sync_queue", {
  id: text().primaryKey(),
  type: text().notNull(),
  table: text().notNull(),
  objectId: text().notNull(),
  data: text(),
  createdAt: text().notNull(),
});

export const tables = {
  groups: groupsTable,
  expenses: expensesTable,
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
