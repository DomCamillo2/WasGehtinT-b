import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getMissingSupabaseEnv, getSupabasePublicKey } from "@/lib/env";

export async function createClient() {
  const missing = getMissingSupabaseEnv();
  if (missing.length) {
    throw new Error(`Supabase-Konfiguration fehlt: ${missing.join(", ")}`);
  }

  const cookieStore = await cookies();
  const publicKey = getSupabasePublicKey();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publicKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              return;
            }
          });
        },
      },
    },
  );
}
