import { createClient } from "@supabase/supabase-js";
import { assertSupabaseAdminConfig } from "./validate";

let adminSingleton: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  assertSupabaseAdminConfig();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY oder NEXT_PUBLIC_SUPABASE_URL fehlt.");
  }

  if (!adminSingleton) {
    adminSingleton = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminSingleton;
}
