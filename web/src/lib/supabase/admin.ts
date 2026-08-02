import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminKey, getSupabaseUrl } from "@/lib/env";
import { assertSupabaseAdminConfig } from "./validate";

let adminSingleton: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  assertSupabaseAdminConfig();

  const url = getSupabaseUrl();
  const adminKey = getSupabaseAdminKey();

  if (!url || !adminKey) {
    throw new Error("SUPABASE_SECRET_KEY oder SUPABASE_SERVICE_ROLE_KEY fehlt, oder NEXT_PUBLIC_SUPABASE_URL fehlt.");
  }

  if (!adminSingleton) {
    adminSingleton = createClient(url, adminKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminSingleton;
}
