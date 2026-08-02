import { createBrowserClient } from "@supabase/ssr";
import { getMissingSupabaseEnv, getSupabasePublicKey, getSupabaseUrl } from "@/lib/env";

export function createClient() {
  const missing = getMissingSupabaseEnv();
  if (missing.length) {
    throw new Error(`Supabase-Konfiguration fehlt: ${missing.join(", ")}`);
  }

  const publicKey = getSupabasePublicKey();
  const url = getSupabaseUrl();

  return createBrowserClient(url!, publicKey!);
}
