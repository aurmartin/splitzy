import type { Database } from "@/lib/db/schema";
import { SyncableTable, syncQueue, tables } from "@/lib/db/schema";
import { RemoteOperation, type SyncOperation } from "@/lib/operation";
import type { SupabaseConnector } from "@/lib/supabase-connector";
import { asyncTime, createLogger, generateId } from "@/lib/utils";
import NetInfo from "@react-native-community/netinfo";
import * as Sentry from "@sentry/react-native";
import { asc, eq, getTableName } from "drizzle-orm";

type TableListener = () => void;

const logger = createLogger("SyncEngine");

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
  private supabaseConnector: SupabaseConnector;
  private db: Database;
  private processQueueInterval?: NodeJS.Timeout;
  private isProcessingLocalOperations = false;
  private tableListeners: Record<string, TableListener[]> = {};

  constructor(supabaseConnector: SupabaseConnector, db: Database) {
    this.supabaseConnector = supabaseConnector;
    this.db = db;
  }

  async init() {
    logger.info("Initializing sync engine");

    if (!this.processQueueInterval) {
      this.processQueueInterval = setInterval(async () => {
        await this.processLocalOperations();
      }, 5000);
    }

    await this.syncAllTablesFromRemote();

    this.supabaseConnector.addRealtimeEventListener(
      "expenses",
      async (remoteOperation) => {
        try {
          await this.handleRemoteOperation(remoteOperation);
        } catch (error) {
          Sentry.captureException(error, { level: "error" });
          logger.error(
            "Error handling remote operation",
            remoteOperation,
            error,
          );
        }
      },
    );

    logger.info("Sync engine initialized");
  }

  dispose() {
    if (this.processQueueInterval) {
      logger.info("Clearing process queue interval");
      clearInterval(this.processQueueInterval);
      this.processQueueInterval = undefined;
    }

    this.supabaseConnector.client.removeAllChannels();
  }

  async syncAllTablesFromRemote() {
    await this.syncTableFromRemote(tables.groups);
    await this.syncTableFromRemote(tables.expenses);
  }

  private async handleRemoteOperation(remoteOperation: RemoteOperation) {
    const table = tables[remoteOperation.entityTable] as SyncableTable;

    logger.debug(
      "Handling remote operation table =",
      remoteOperation.entityTable,
      "operation =",
      remoteOperation.operationType,
      "id =",
      remoteOperation.entityId,
    );

    switch (remoteOperation.operationType) {
      case "insert":
        const insertFields = {
          ...remoteOperation.changes,
          id: remoteOperation.entityId,
        };

        await this.db
          .insert(table)
          .values(insertFields)
          .onConflictDoUpdate({
            target: [table.id],
            set: insertFields,
          });

        break;

      case "update":
        const updateFields = {
          ...remoteOperation.changes,
          id: remoteOperation.entityId,
        };

        await this.db
          .update(table)
          .set(updateFields)
          .where(eq(table.id, remoteOperation.entityId));
        break;

      case "delete":
        await this.db
          .delete(table)
          .where(eq(table.id, remoteOperation.entityId));
        break;
    }

    this.notifyTableListeners(table);
  }

  async insert(table: SyncableTable, id: string, data: Record<string, any>) {
    const updateFields = { ...data, id };

    logger.debug("Insert operation table =", getTableName(table), "- id =", id);

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

      this.notifyTableListeners(table);
      this.processLocalOperations();
    } catch (error) {
      Sentry.captureException(error);
      logger.error("Error inserting row", id, error);
      throw error;
    }
  }

  async update(table: SyncableTable, id: string, data: Record<string, any>) {
    const updateFields = { ...data, id };

    logger.debug("Update operation table =", getTableName(table), "- id =", id);

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

      this.notifyTableListeners(table);
      this.processLocalOperations();
    } catch (error) {
      Sentry.captureException(error, { level: "error" });
      logger.error("Error updating row", id, error);
      throw error;
    }
  }

  async delete(table: SyncableTable, id: string) {
    logger.debug("Delete operation table =", getTableName(table), "- id =", id);

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

      this.notifyTableListeners(table);
      this.processLocalOperations();
    } catch (error) {
      Sentry.captureException(error, { level: "error" });
      logger.error("Error deleting row", id, error);
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
      const { data: remoteEntities, error } =
        await this.supabaseConnector.client.from(getTableName(table)).select();

      if (error) {
        throw error;
      }

      if (remoteEntities) {
        logger.info(
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

        // Delete missing rows from the database if they are not locally created
        for (const localEntity of localEntities) {
          const haveLocalInsertOperation = localOperations.some(
            ({ entityId, operationType }) =>
              entityId === localEntity.id && operationType === "insert",
          );

          const inRemoteEntities = remoteEntities.some(
            ({ id }) => id === localEntity.id,
          );

          if (!inRemoteEntities && !haveLocalInsertOperation) {
            await this.db.delete(table).where(eq(table.id, localEntity.id));
          }
        }

        this.notifyTableListeners(table);
      } else {
        logger.warn(
          `syncTableFromRemote(${getTableName(table)}) found no data in supabase.`,
        );
      }
    } catch (error: any) {
      Sentry.captureException(error, { level: "error" });
      logger.error(
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
      logger.info("Queue is already being processed, skipping");
      return;
    }

    const networkState = await NetInfo.fetch();
    if (!networkState.isInternetReachable) {
      logger.info("Network is disconnected, skipping queue");
      return;
    }

    this.isProcessingLocalOperations = true;

    try {
      await this.doProcessLocalOperations();
    } catch (error) {
      Sentry.captureException(error, { level: "error" });
      logger.error("Error processing queue", error);
      throw error;
    } finally {
      this.isProcessingLocalOperations = false;
    }
  }

  private async doProcessLocalOperations() {
    logger.debug("Processing queue...");

    while (true) {
      const operation = this.getNextLocalOperation();

      if (operation === null) {
        break;
      }

      logger.debug(
        "Processing operation id =",
        operation.id,
        "- type =",
        operation.operationType,
        "- entity =",
        operation.entityTable,
        "- entityId =",
        operation.entityId,
      );

      try {
        let result: any;

        if (operation.operationType === "insert") {
          const data: any = {
            ...operation.changes,
            id: operation.entityId,
          };

          result = await this.supabaseConnector.client
            .from(operation.entityTable)
            .insert(data);
        } else if (operation.operationType === "update") {
          const data: any = {
            ...operation.changes,
            id: operation.entityId,
          };

          result = await this.supabaseConnector.client
            .from(operation.entityTable)
            .update(data)
            .eq("id", operation.entityId);
        } else if (operation.operationType === "delete") {
          result = await this.supabaseConnector.client
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
        logger.error("Error processing operation.", operation, error);

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

    logger.debug("Queue processed successfully");
  }

  private async rollback(operation: SyncOperation) {
    try {
      logger.info("Rolling back operation", operation);

      const supabaseRow = await this.supabaseConnector.client
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
      logger.error("Error rolling back operation", operation, error);
    }
  }

  private getNextLocalOperation(): SyncOperation | null {
    const rows = this.db
      .select()
      .from(syncQueue)
      .orderBy(asc(syncQueue.createdAt))
      .limit(1)
      .all();

    if (rows.length === 0) {
      return null;
    }

    return this.decodeOperation(rows[0]);
  }

  private getLocalOperationsForTable(table: SyncableTable): SyncOperation[] {
    const rows = this.db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.entityTable, getTableName(table)))
      .orderBy(asc(syncQueue.createdAt))
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

  watchTable(table: SyncableTable, listener: TableListener) {
    const tableName = getTableName(table);

    if (!this.tableListeners[tableName]) {
      this.tableListeners[tableName] = [];
    }

    this.tableListeners[tableName].push(listener);

    return () => {
      this.tableListeners[tableName] = this.tableListeners[tableName].filter(
        (l) => l !== listener,
      );
    };
  }

  private notifyTableListeners(table: SyncableTable) {
    const tableName = getTableName(table);

    if (this.tableListeners[tableName]) {
      this.tableListeners[tableName].forEach((listener) => listener());
    }
  }
}

export { SyncEngine };
