import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { Env } from "./env";
import { System } from "./system";

const storageKey = "supabase.auth.token";

export class SupabaseConnector {
  client: SupabaseClient;

  constructor(protected system: System) {
    this.client = createClient(Env.SUPABASE_URL, Env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        storage: this.system.kvStorage,
        storageKey,
      },
    });
  }

  async login(username: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (error) {
      throw error;
    }
  }

  async userId() {
    const {
      data: { session },
    } = await this.client.auth.getSession();

    return session?.user.id;
  }

  hasLocalSession() {
    const maybeSession = this.system.kvStorage.getItem(storageKey);

    if (!maybeSession) {
      return false;
    }

    return true;
  }
}
