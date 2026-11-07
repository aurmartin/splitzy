#!/usr/bin/env node
// Signs in to the local Supabase stack (`pnpm db:start`) without any email.
//
//   node scripts/local-supabase.mjs login [email] [simulator]
//
// Creates the user if needed, signs in with a magic link token and opens the
// app's redirect screen with the session in an iOS simulator. With several
// simulators booted, pass the simulator name or UDID.
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

const DEFAULT_EMAIL = "dev@splitzy.local";
const REDIRECT_URL = "splitzy-dev://redirect";

const readStatus = () => {
  let output;

  try {
    output = execFileSync("supabase", ["status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    console.error("Local Supabase is not running. Start it with: pnpm db:start");
    process.exit(1);
  }

  const status = JSON.parse(output.slice(output.indexOf("{")));
  const url = status.API_URL;
  const anonKey = status.ANON_KEY ?? status.PUBLISHABLE_KEY;
  const serviceRoleKey = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    console.error("Unexpected `supabase status` output:", Object.keys(status));
    process.exit(1);
  }

  return { url, anonKey, serviceRoleKey };
};

const login = async (email = DEFAULT_EMAIL, simulator = "booted") => {
  const { url, anonKey, serviceRoleKey } = readStatus();
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, serviceRoleKey, options);

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (createError && createError.code !== "email_exists") {
    throw createError;
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError) {
    throw linkError;
  }

  // Verify the token here rather than through the link: the local auth server
  // rejects GET /verify, so the browser never reaches the app.
  const { data, error } = await createClient(url, anonKey, options).auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  });
  if (error) {
    throw error;
  }

  const { access_token, refresh_token } = data.session;
  const redirect = `${REDIRECT_URL}#access_token=${access_token}&refresh_token=${refresh_token}`;

  try {
    execFileSync("xcrun", ["simctl", "openurl", simulator, redirect], {
      stdio: "ignore",
    });
    console.log(`Signed in as ${email} in ${simulator}.`);
  } catch {
    console.error(`Could not open the app in the "${simulator}" simulator.`);
    process.exit(1);
  }
};

const [command, ...args] = process.argv.slice(2);

if (command !== "login") {
  console.error("Usage: node scripts/local-supabase.mjs login [email] [simulator]");
  process.exit(1);
}

await login(...args);
