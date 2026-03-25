import { createBrowserClient } from "@supabase/ssr";
import { getMissingSupabaseEnv } from "@/lib/env";

export function createClient() {
  const missing = getMissingSupabaseEnv();
  if (missing.length) {
    throw new Error(`Supabase-Konfiguration fehlt: ${missing.join(", ")}`);
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
