import type { Database } from "@/lib/db/schema";
import { SyncableTable, syncQueue, tables } from "@/lib/db/schema";
import { asyncTime, generateId } from "@/lib/utils";
import NetInfo from "@react-native-community/netinfo";
import * as Sentry from "@sentry/react-native";
import { SupabaseClient } from "@supabase/supabase-js";
import { desc, eq, getTableName } from "drizzle-orm";

type SyncOperation = {
  id: string;
  operationType: "insert" | "update" | "delete";
  entityId: string;
  entityTable: keyof typeof tables;
  changes: Record<string, any> | undefined;
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

  private processQueueInterval?: NodeJS.Timeout;
  private isProcessingLocalOperations = false;

  constructor(supabase: SupabaseClient, db: Database) {
    this.supabase = supabase;
    this.db = db;
  }

  async init() {
    this.log("info", "Initializing sync engine");

    await this.syncAllTablesFromRemote();

    if (!this.processQueueInterval) {
      this.processQueueInterval = setInterval(async () => {
        await this.processLocalOperations();
      }, 5000);
    }

    this.log("info", "Sync engine initialized");
  }

  dispose() {
    if (this.processQueueInterval) {
      this.log("info", "Clearing process queue interval");
      clearInterval(this.processQueueInterval);
      this.processQueueInterval = undefined;
    }
  }

  async syncAllTablesFromRemote() {
    await this.syncTableFromRemote(tables.groups);
    await this.syncTableFromRemote(tables.expenses);
  }

  async insert(table: SyncableTable, id: string, data: Record<string, any>) {
    const updateFields = { ...data, id };

    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(table).values(updateFields);
        await tx.insert(syncQueue).values({
          id: generateId(),
          entityId: id,
          entityTable: getTableName(table),
          operationType: "insert",
          changes: JSON.stringify(updateFields),
          createdAt: new Date().toISOString(),
        });
      });

      this.processLocalOperations();
    } catch (error) {
      Sentry.captureException(error);
      this.log("error", "Error inserting row", id, error);
      throw error;
    }
  }

  async update(table: SyncableTable, id: string, data: Record<string, any>) {
    const updateFields = { ...data, id };

    try {
      await this.db.transaction(async (tx) => {
        await tx.update(table).set(updateFields).where(eq(table.id, id));
        await tx.insert(syncQueue).values({
          id: generateId(),
          entityId: id,
          entityTable: getTableName(table),
          operationType: "update",
          changes: JSON.stringify(updateFields),
          createdAt: new Date().toISOString(),
        });
      });

      this.processLocalOperations();
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
          entityId: id,
          entityTable: getTableName(table),
          operationType: "delete",
          createdAt: new Date().toISOString(),
        });
      });

      this.processLocalOperations();
    } catch (error) {
      Sentry.captureException(error, { level: "error" });
      this.log("error", "Error deleting row", id, error);
      throw error;
    }
  }

  async syncTableFromRemote(table: SyncableTable) {
    await asyncTime(
      `[SYNC ENGINE] syncTableFromRemote(${getTableName(table)})`,
      async () => await this._syncTableFromRemote(table),
    );
  }

  private async _syncTableFromRemote(table: SyncableTable) {
    try {
      const { data: remoteEntities, error } = await this.supabase
        .from(getTableName(table))
        .select();

      if (error) {
        throw error;
      }

      if (remoteEntities) {
        this.log(
          "info",
          `syncTableFromRemote(${getTableName(table)}) found ${remoteEntities.length} entities in supabase.`,
        );

        const localOperations = this.getLocalOperationsForTable(table);

        const localEntities = this.db.select().from(table).all();

        // Upsert the rows into the database
        for (const remoteEntity of remoteEntities) {
          const updatedEntity = this.mergeLocalOperations(
            remoteEntity,
            localOperations,
          );

          if (updatedEntity) {
            await this.db
              .insert(table)
              .values(updatedEntity)
              .onConflictDoUpdate({
                target: [table.id],
                set: updatedEntity,
              });
          }
        }

        // Insert locally created rows that are not in remote
        for (const localOperation of localOperations) {
          if (
            localOperation.operationType === "insert" &&
            !remoteEntities.some((r) => r.id === localOperation.entityId)
          ) {
            const entity: any = {
              ...localOperation.changes,
              id: localOperation.entityId,
            };
            await this.db.insert(table).values(entity);
          }
        }

        // Delete missing rows from the database
        for (const localEntity of localEntities) {
          if (!remoteEntities.some((r) => r.id === localEntity.id)) {
            await this.db.delete(table).where(eq(table.id, localEntity.id));
          }
        }
      } else {
        this.log(
          "warn",
          `syncTableFromRemote(${getTableName(table)}) found no data in supabase.`,
        );
      }
    } catch (error: any) {
      Sentry.captureException(error, { level: "error" });
      this.log(
        "error",
        "Error refreshing table",
        getTableName(table),
        error?.message || error,
      );
      throw error;
    }
  }

  private mergeLocalOperations(entity: any, operations: SyncOperation[]) {
    let result = entity;

    for (const operation of operations) {
      if (operation.entityId !== entity.id) {
        continue;
      }

      if (operation.operationType === "update") {
        result = { ...entity, ...operation.changes };
      } else if (operation.operationType === "delete") {
        return null;
      }
    }

    return result;
  }

  async processLocalOperations() {
    if (this.isProcessingLocalOperations) {
      this.log("info", "Queue is already being processed, skipping");
      return;
    }

    this.isProcessingLocalOperations = true;

    const networkState = await NetInfo.fetch();
    if (!networkState.isInternetReachable) {
      this.log("info", "Network is disconnected, skipping queue");
      return;
    }

    try {
      await this.doProcessLocalOperations();
    } catch (error) {
      Sentry.captureException(error, { level: "error" });
      this.log("error", "Error processing queue", error);
      throw error;
    } finally {
      this.isProcessingLocalOperations = false;
    }
  }

  private async doProcessLocalOperations() {
    this.log("debug", "Processing queue...");

    const operations = this.getLocaLOperations();

    for (const operation of operations) {
      this.log("debug", "Processing operation", operation);

      try {
        let result: any;

        if (operation.operationType === "insert") {
          const data: any = {
            ...operation.changes,
            id: operation.entityId,
          };

          result = await this.supabase.from(operation.entityTable).insert(data);
        } else if (operation.operationType === "update") {
          const data: any = {
            ...operation.changes,
            id: operation.entityId,
          };

          result = await this.supabase
            .from(operation.entityTable)
            .update(data)
            .eq("id", operation.entityId);
        } else if (operation.operationType === "delete") {
          result = await this.supabase
            .from(operation.entityTable)
            .delete()
            .eq("id", operation.entityId);
        }

        if (result.error) {
          throw result.error;
        }

        // Remove the operation from the queue
        await this.db.delete(syncQueue).where(eq(syncQueue.id, operation.id));
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

    this.log("debug", "Queue processed successfully");
  }

  private async rollback(operation: SyncOperation) {
    try {
      this.log("info", "Rolling back operation", operation);

      const supabaseRow = await this.supabase
        .from(operation.entityTable)
        .select()
        .eq("id", operation.entityId)
        .single();

      await this.db.transaction(async (tx) => {
        // Remove the operation from the queue
        await tx.delete(syncQueue).where(eq(syncQueue.id, operation.id));

        const table = tables[operation.entityTable];

        // If the row exists in supabase, update the row in the database, else delete the row
        if (supabaseRow.data) {
          await tx
            .update(table)
            .set(supabaseRow.data)
            .where(eq(table.id, operation.entityId));
        } else {
          await tx.delete(table).where(eq(table.id, operation.entityId));
        }
      });
    } catch (error) {
      Sentry.captureException(error, { level: "error" });
      this.log("error", "Error rolling back operation", operation, error);
    }
  }

  private getLocaLOperations(): SyncOperation[] {
    const rows = this.db
      .select()
      .from(syncQueue)
      .orderBy(desc(syncQueue.createdAt))
      .all();

    return rows.map((row) => this.decodeOperation(row));
  }

  private getLocalOperationsForTable(table: SyncableTable): SyncOperation[] {
    const rows = this.db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.entityTable, getTableName(table)))
      .orderBy(desc(syncQueue.createdAt))
      .all();

    return rows.map((row) => this.decodeOperation(row));
  }

  private decodeOperation(row: any): SyncOperation {
    return {
      id: row.id,
      operationType: row.operationType as SyncOperation["operationType"],
      changes: row.changes ? JSON.parse(row.changes) : undefined,
      createdAt: new Date(row.createdAt),
      entityTable: row.entityTable as keyof typeof tables,
      entityId: row.entityId,
    };
  }

  private log(level: "debug" | "info" | "warn" | "error", ...args: any[]) {
    console[level](new Date().toISOString(), `[SYNC ENGINE]`, ...args);
  }
}

export { SyncEngine };
