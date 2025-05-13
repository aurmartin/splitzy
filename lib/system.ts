import { KVStorage } from "@/lib/kv-storage";
import { SupabaseConnector } from "@/lib/supabase-connector";
import { SyncEngine } from "@/lib/sync-engine";
import { ServerConnector } from "@/lib/server-connector";
import { schemaMigrationsTable, type Database } from "@/lib/db/schema";

interface Migration {
  up: (db: Database) => Promise<void>;
  version: number;
  name: string;
}

const getMigrations = (): Migration[] => [
  {
    version: 1,
    name: "Initial migration",
    up: async (db: Database) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS groups (
          id text PRIMARY KEY NOT NULL,
          name text NOT NULL,
          currency text NOT NULL,
          members text NOT NULL,
          createdAt text NOT NULL,
          updatedAt text NOT NULL,
          deletedAt text
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS expenses (
          id text PRIMARY KEY NOT NULL,
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

      db.run(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id text PRIMARY KEY NOT NULL,
          operationType text NOT NULL,
          entityTable text NOT NULL,
          entityId text NOT NULL,
          changes text,
          createdAt text NOT NULL
        );
      `);
    },
  },
];

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

    this.syncEngine = new SyncEngine(this.supabaseConnector, this.db);
  }

  async initializeMigrations() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        appliedAt TEXT NOT NULL
      );
    `);

    const result = this.db.get<{ version: number }>(
      "SELECT COALESCE(MAX(version), 0) as version FROM schema_migrations",
    );
    const currentVersion = result.version;

    const migrations = getMigrations();

    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(
          `Applying migration ${migration.version}: ${migration.name}`,
        );

        try {
          await this.db.transaction(async (tx) => {
            await migration.up(tx);

            await tx.insert(schemaMigrationsTable).values({
              version: migration.version,
              appliedAt: new Date().toISOString(),
            });
          });
          console.log(`Migration ${migration.version} applied successfully`);
        } catch (error) {
          console.error(`Migration ${migration.version} failed:`, error);
          this.db.run("ROLLBACK");
          throw error;
        }
      }
    }
  }

  dispose() {
    this.syncEngine.dispose();
  }

  async init() {
    await this.initializeMigrations();
    await this.syncEngine.init();
  }

  async setSession(session: { access_token: string; refresh_token: string }) {
    const authResponse = await this.supabaseConnector.setSession(session);

    if (authResponse.error) {
      return authResponse;
    }

    await this.syncEngine.syncAllTablesFromRemote();

    return authResponse;
  }
}
