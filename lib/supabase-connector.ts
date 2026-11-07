import {
  createClient,
  type PostgrestError,
  type SupabaseClient,
  type RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { tables } from "./db/schema";
import { Env } from "./env";
import type { OperationType, RemoteOperation } from "./operation";
import { System } from "./system";

const storageKey = "supabase.auth.token";

const SELECT_PAGE_SIZE = 1000;

type TableName = Exclude<keyof typeof tables, "syncQueue">;
type RealtimeEventListener = (operation: RemoteOperation) => void;

export class SupabaseConnector {
  private client: SupabaseClient;
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
    Object.keys(this.realtimeEventListeners).forEach((table) => this.realtimeSubscribeToTable(table as TableName));
  }

  private realtimeSubscribeToTable(table: TableName) {
    this.client
      .channel(table)
      .on("postgres_changes", { event: "*", schema: "public", table }, (message) =>
        this.handleRealtimeMessage(table, message),
      )
      .subscribe();
  }

  handleRealtimeMessage(table: TableName, payload: RealtimePostgresChangesPayload<any>) {
    const remoteOperation = this.remoteOperationFromPayload(table, payload);

    this.realtimeEventListeners[table].forEach((listener) => listener(remoteOperation));
  }

  private remoteOperationFromPayload(table: TableName, payload: RealtimePostgresChangesPayload<any>): RemoteOperation {
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

  removeAllChannels() {
    return this.client.removeAllChannels();
  }

  hasLocalSession() {
    const maybeSession = this.system.kvStorage.getItem(storageKey);

    if (!maybeSession) {
      return false;
    }

    return true;
  }

  getSession() {
    return this.client.auth.getSession();
  }

  setSession(session: { access_token: string; refresh_token: string }) {
    return this.client.auth.setSession(session);
  }

  getUser() {
    return this.client.auth.getUser();
  }

  signInWithOtp(email: string) {
    return this.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${Env.SCHEME}://redirect?`,
        shouldCreateUser: true,
      },
    });
  }

  selectSingle(table: string, id: string) {
    return this.client.from(table).select().eq("id", id).single();
  }

  async selectAll(table: string): Promise<{ data: any[]; error: null } | { data: null; error: PostgrestError }> {
    const rows: any[] = [];
    let lastId: string | undefined;

    while (true) {
      let query = this.client.from(table).select().order("id").limit(SELECT_PAGE_SIZE);
      if (lastId !== undefined) {
        query = query.gt("id", lastId);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error };
      }

      if (data.length === 0) {
        return { data: rows, error: null };
      }

      rows.push(...data);
      lastId = data[data.length - 1].id;
    }
  }

  insert(table: string, data: Record<string, any>) {
    return this.client.from(table).insert(data);
  }

  update(table: string, id: string, data: Record<string, any>) {
    return this.client.from(table).update(data).eq("id", id);
  }

  delete(table: string, id: string) {
    return this.client.from(table).delete().eq("id", id);
  }

  // Deletes the signed-in user's membership: the group and its expenses are
  // then no longer visible to them.
  async leaveGroup(groupId: string) {
    const { data, error } = await this.getUser();

    if (error) {
      return { error };
    }

    return this.client.from("members").delete().eq("user_id", data.user.id).eq("group_id", groupId);
  }
}

export type { RealtimePostgresChangesPayload };
