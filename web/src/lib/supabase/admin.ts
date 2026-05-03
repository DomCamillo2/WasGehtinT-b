import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminKey } from "@/lib/env";
import { assertSupabaseAdminConfig } from "./validate";

let adminSingleton: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  assertSupabaseAdminConfig();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
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
