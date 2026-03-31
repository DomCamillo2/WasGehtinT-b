const SUPABASE_URL_KEY = "NEXT_PUBLIC_SUPABASE_URL" as const;
const SUPABASE_ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY" as const;
const SUPABASE_PUBLISHABLE_KEY = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" as const;

export function getSupabasePublicKey() {
  return process.env[SUPABASE_PUBLISHABLE_KEY] || process.env[SUPABASE_ANON_KEY] || null;
}

export function getMissingSupabaseEnv() {
  const missing: string[] = [];

  if (!process.env[SUPABASE_URL_KEY]) {
    missing.push(SUPABASE_URL_KEY);
  }

  if (!getSupabasePublicKey()) {
    missing.push(`${SUPABASE_PUBLISHABLE_KEY} or ${SUPABASE_ANON_KEY}`);
  }

  return missing;
}

export function hasSupabaseEnv() {
  return getMissingSupabaseEnv().length === 0;
}
