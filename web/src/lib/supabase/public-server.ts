import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getMissingSupabaseEnv, getSupabasePublicKey, getSupabaseUrl } from "@/lib/env";

let publicSingleton: SupabaseClient | null = null;

export function getSupabasePublicServerClient() {
  const missing = getMissingSupabaseEnv();
  if (missing.length) {
    throw new Error(`Supabase-Konfiguration fehlt: ${missing.join(", ")}`);
  }

  const url = getSupabaseUrl()!;
  const publicKey = getSupabasePublicKey()!;

  if (!publicSingleton) {
    publicSingleton = createClient(url, publicKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return publicSingleton;
}
