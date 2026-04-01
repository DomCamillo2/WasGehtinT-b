import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getMissingSupabaseEnv, getSupabasePublicKey } from "@/lib/env";

let publicSingleton: SupabaseClient<any, "public", any> | null = null;

export function getSupabasePublicServerClient() {
  const missing = getMissingSupabaseEnv();
  if (missing.length) {
    throw new Error(`Supabase-Konfiguration fehlt: ${missing.join(", ")}`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publicKey = getSupabasePublicKey()!;

  if (!publicSingleton) {
    publicSingleton = createClient<any>(url, publicKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return publicSingleton;
}
