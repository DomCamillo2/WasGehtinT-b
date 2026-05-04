import { createBrowserClient } from "@supabase/ssr";
import { getMissingSupabaseEnv, getSupabasePublicKey } from "@/lib/env";

export function createClient() {
  const missing = getMissingSupabaseEnv();
  if (missing.length) {
    throw new Error(`Supabase-Konfiguration fehlt: ${missing.join(", ")}`);
  }

  const publicKey = getSupabasePublicKey();

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publicKey!,
  );
}
