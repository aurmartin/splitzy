import { KVStorage } from "@/lib/kv-storage";
import { SupabaseConnector } from "@/lib/supabase-connector";
import { SyncEngine } from "@/lib/sync-engine";
import { ServerConnector } from "@/lib/server-connector";
import { type Database } from "@/lib/db/schema";

export class System {
  kvStorage: KVStorage;
  supabaseConnector: SupabaseConnector;
  db: Database;
  syncEngine: SyncEngine;
  serverConnector: ServerConnector;

  constructor(database: Database) {
    this.kvStorage = new KVStorage();
    this.supabaseConnector = new SupabaseConnector(this);
    this.serverConnector = new ServerConnector(this);

    this.db = database;

    // this.db.run(`DROP TABLE IF EXISTS groups`);
    // this.db.run(`DROP TABLE IF EXISTS expenses`);
    // this.db.run(`DROP TABLE IF EXISTS sync_queue`);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS groups (
	      id text PRIMARY KEY NOT NULL,
	      syncStatus text NOT NULL,
	      name text NOT NULL,
	      currency text NOT NULL,
	      members text NOT NULL,
        createdAt text NOT NULL,
        updatedAt text NOT NULL,
        deletedAt text
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS expenses (
        id text PRIMARY KEY NOT NULL,
        syncStatus text NOT NULL,
        groupId text NOT NULL,
        title text NOT NULL,
        payerName text NOT NULL,
        splitExpense text NOT NULL,
        createdAt text NOT NULL,
        updatedAt text NOT NULL,
        deletedAt text,
        receipt text
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id text PRIMARY KEY NOT NULL,
        type text NOT NULL,
        \`table\` text NOT NULL,
        data text,
        objectId text NOT NULL,
        createdAt text NOT NULL
      );
    `);

    // this.db.run("PRAGMA journal_mode = WAL;");

    this.syncEngine = new SyncEngine(this.supabaseConnector.client, this.db);
  }

  async dispose() {
    await this.syncEngine.dispose();
  }

  async init() {
    await this.syncEngine.init();
  }

  async setSession(session: { access_token: string; refresh_token: string }) {
    const authResponse =
      await this.supabaseConnector.client.auth.setSession(session);

    if (authResponse.error) {
      return authResponse;
    }

    await this.syncEngine.refreshAllTables();

    return authResponse;
  }
}
