import {
  SyncableTable,
  syncQueue,
  tables,
  type Transaction,
} from "@/lib/db/schema";
import type { Database } from "@/lib/db/schema";
import { asyncTime, generateId } from "@/lib/utils";
import NetInfo from "@react-native-community/netinfo";
import { SupabaseClient } from "@supabase/supabase-js";
import { eq, getTableName } from "drizzle-orm";
import * as Sentry from "@sentry/react-native";

type SyncOperation = {
  id: string;
  type: "insert" | "update" | "delete";
  objectId: string;
  data: Record<string, any> | undefined;
  table: keyof typeof tables;
  createdAt: Date;
};

/// Postgres Response codes that we cannot recover from by retrying.
const FATAL_RESPONSE_CODES = [
  // Class 22 — Data Exception
  // Examples include data type mismatch.
  new RegExp("^22...$"),
  // Class 23 — Integrity Constraint Violation.
  // Examples include NOT NULL, FOREIGN KEY and UNIQUE violations.
  new RegExp("^23...$"),
  // INSUFFICIENT PRIVILEGE - typically a row-level security violation
  new RegExp("^42501$"),
];

class SyncEngine {
  supabase: SupabaseClient;
  db: Database;
  processQueueTimer?: NodeJS.Timeout;

  constructor(supabase: SupabaseClient, db: Database) {
    this.supabase = supabase;
    this.db = db;
  }

  async init() {
    this.log("info", "Init");

    await this.processQueue();
    await this.refreshAllTables();

    this.processQueueSchedule();
  }

  async dispose() {
    if (this.processQueueTimer) {
      this.log("info", "Disposing");
      clearTimeout(this.processQueueTimer);
    }
  }

  private async processQueueSchedule() {
    if (this.processQueueTimer) {
      clearTimeout(this.processQueueTimer);
    }

    await this.processQueue();

    this.processQueueTimer = setTimeout(() => {
      this.processQueueSchedule();
    }, 5000);
  }

  async refreshAllTables() {
    await this.refreshTable(tables.groups);
    await this.refreshTable(tables.expenses);
  }

  async insert(table: SyncableTable, id: string, data: Record<string, any>) {
    const updateFields = {
      ...data,
      id,
      syncStatus: "pending",
    };

    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(table).values(updateFields);
        await tx.insert(syncQueue).values({
          id: generateId(),
          objectId: id,
          type: "insert",
          table: getTableName(table),
          data: JSON.stringify(updateFields),
          createdAt: new Date().toISOString(),
        });
        this.processQueue();
      });
    } catch (error) {
      Sentry.captureException(error);
      this.log("error", "Error inserting row", id, error);
      throw error;
    }
  }

  async update(table: SyncableTable, id: string, data: Record<string, any>) {
    const updateFields = {
      ...data,
      id,
      syncStatus: "pending",
    };

    try {
      await this.db.transaction(async (tx) => {
        await tx.update(table).set(updateFields).where(eq(table.id, id));
        await tx.insert(syncQueue).values({
          id: generateId(),
          objectId: id,
          type: "update",
          table: getTableName(table),
          data: JSON.stringify(updateFields),
          createdAt: new Date().toISOString(),
        });
        this.processQueue();
      });
    } catch (error) {
      Sentry.captureException(error, { level: "error" });
      this.log("error", "Error updating row", id, error);
      throw error;
    }
  }

  async delete(table: SyncableTable, id: string) {
    try {
      await this.db.transaction(async (tx) => {
        await tx.delete(table).where(eq(table.id, id));
        await tx.insert(syncQueue).values({
          id: generateId(),
          objectId: id,
          type: "delete",
          table: getTableName(table),
          createdAt: new Date().toISOString(),
        });
        this.processQueue();
      });
    } catch (error) {
      Sentry.captureException(error, { level: "error" });
      this.log("error", "Error deleting row", id, error);
      throw error;
    }
  }

  async refreshTable(table: SyncableTable) {
    await asyncTime(
      `[SYNC ENGINE] refreshTable(${getTableName(table)})`,
      async () => await this._refreshTable(table),
    );
  }

  private async _refreshTable(table: SyncableTable) {
    try {
      const { data } = await this.supabase.from(getTableName(table)).select();

      if (data) {
        this.log(
          "info",
          `refreshTable(${getTableName(table)}) found ${data.length} rows in supabase.`,
        );

        // Upsert the rows into the database
        for (const row of data) {
          const record = { ...row, syncStatus: "synced" };
          await this.db
            .insert(table)
            .values(record)
            .onConflictDoUpdate({
              target: [table.id],
              set: record,
            });
        }

        // Delete missing rows from the database
        const rows = this.db.select().from(table).all();
        for (const row of rows) {
          if (!data.some((r) => r.id === row.id)) {
            await this.db.delete(table).where(eq(table.id, row.id));
          }
        }
      } else {
        this.log(
          "warn",
          `refreshTable(${getTableName(table)}) found no data in supabase.`,
        );
      }
    } catch (error) {
      Sentry.captureException(error, { level: "error" });
      this.log("error", "Error refreshing table", getTableName(table), error);
      throw error;
    }
  }

  private async processQueue() {
    const networkState = await NetInfo.fetch();
    if (!networkState.isInternetReachable) {
      this.log("info", "Network is disconnected, skipping queue");
      return;
    }

    try {
      await this.db.transaction(async (tx) => {
        await this.processQueueTransaction(tx);
      });
    } catch (error) {
      Sentry.captureException(error, { level: "error" });
      this.log("error", "Error processing queue", error);
      throw error;
    }
  }

  private async processQueueTransaction(tx: Transaction) {
    // this.log("info", "Processing queue...");

    const operations = this.getAllSyncOperations(tx);

    for (const operation of operations) {
      try {
        let result: any;

        if (operation.type === "insert") {
          const data: any = {
            ...operation.data,
            id: operation.objectId,
          };
          delete data.syncStatus;
          result = await this.supabase.from(operation.table).insert(data);
        } else if (operation.type === "update") {
          const data: any = {
            ...operation.data,
            id: operation.objectId,
          };
          delete data.syncStatus;
          result = await this.supabase
            .from(operation.table)
            .update(data)
            .eq("id", operation.objectId);
        } else if (operation.type === "delete") {
          result = await this.supabase
            .from(operation.table)
            .delete()
            .eq("id", operation.objectId);
        }

        if (result.error) {
          throw result.error;
        }

        // Remove the operation from the queue
        await tx.delete(syncQueue).where(eq(syncQueue.id, operation.id));
      } catch (error: any) {
        Sentry.captureException(error, { level: "error" });
        this.log("error", "Error processing operation.", operation, error);

        if (
          typeof error.code == "string" &&
          FATAL_RESPONSE_CODES.some((regex) => regex.test(error.code))
        ) {
          await this.rollback(operation);
        } else {
          throw error;
        }
      }
    }
  }

  private async rollback(operation: SyncOperation) {
    try {
      this.log("info", "Rolling back operation", operation);

      const supabaseRow = await this.supabase
        .from(operation.table)
        .select()
        .eq("id", operation.objectId)
        .single();

      await this.db.transaction(async (tx) => {
        // Remove the operation from the queue
        await tx.delete(syncQueue).where(eq(syncQueue.id, operation.id));

        const table = tables[operation.table];

        // If the row exists in supabase, update the row in the database, else delete the row
        if (supabaseRow.data) {
          await tx
            .update(table)
            .set(supabaseRow.data)
            .where(eq(table.id, operation.objectId));
        } else {
          await tx.delete(table).where(eq(table.id, operation.objectId));
        }
      });
    } catch (error) {
      Sentry.captureException(error, { level: "error" });
      this.log("error", "Error rolling back operation", operation, error);
    }
  }

  private getAllSyncOperations(tx: Transaction): SyncOperation[] {
    const rows = tx.select().from(syncQueue).all();

    return rows.map((row) => ({
      type: row.type as SyncOperation["type"],
      data: row.data ? JSON.parse(row.data) : undefined,
      createdAt: new Date(row.createdAt),
      table: row.table as keyof typeof tables,
      id: row.id,
      objectId: row.objectId,
    }));
  }

  private log(level: "info" | "warn" | "error", ...args: any[]) {
    console[level](`[SYNC ENGINE]`, ...args);
  }
}

export { SyncEngine };
