import { type RealtimePostgresChangesPayload } from "@supabase/realtime-js";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { tables } from "./db/schema";
import { Env } from "./env";
import type { OperationType, RemoteOperation } from "./operation";
import { System } from "./system";

const storageKey = "supabase.auth.token";

type TableName = Exclude<keyof typeof tables, "syncQueue">;
type RealtimeEventListener = (operation: RemoteOperation) => void;

export class SupabaseConnector {
  client: SupabaseClient;
  private realtimeEventListeners: Record<TableName, RealtimeEventListener[]>;

  constructor(protected system: System) {
    this.client = createClient(Env.SUPABASE_URL, Env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        storage: this.system.kvStorage,
        storageKey,
      },
    });

    this.realtimeEventListeners = {
      groups: [],
      expenses: [],
    };

    this.realtimeSubscribe();
  }

  private realtimeSubscribe() {
    Object.keys(this.realtimeEventListeners).forEach((table) =>
      this.realtimeSubscribeToTable(table as TableName),
    );
  }

  private realtimeSubscribeToTable(table: TableName) {
    this.client
      .channel(table)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (message) => this.handleRealtimeMessage(table, message),
      )
      .subscribe();
  }

  handleRealtimeMessage(
    table: TableName,
    payload: RealtimePostgresChangesPayload<any>,
  ) {
    const remoteOperation = this.remoteOperationFromPayload(table, payload);

    this.realtimeEventListeners[table].forEach((listener) =>
      listener(remoteOperation),
    );
  }

  private remoteOperationFromPayload(
    table: TableName,
    payload: RealtimePostgresChangesPayload<any>,
  ): RemoteOperation {
    let type: OperationType;
    let entityId: string;

    switch (payload.eventType) {
      case "INSERT":
        type = "insert";
        entityId = payload.new.id;
        break;
      case "UPDATE":
        type = "update";
        entityId = payload.new.id;
        break;
      case "DELETE":
        type = "delete";
        entityId = payload.old.id;
        break;
    }

    return {
      operationType: type,
      changes: payload.new,
      entityTable: table,
      entityId,
    };
  }

  addRealtimeEventListener(table: TableName, listener: RealtimeEventListener) {
    this.realtimeEventListeners[table].push(listener);
  }

  hasLocalSession() {
    const maybeSession = this.system.kvStorage.getItem(storageKey);

    if (!maybeSession) {
      return false;
    }

    return true;
  }
}
