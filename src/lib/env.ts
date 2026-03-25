const SUPABASE_REQUIRED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function getMissingSupabaseEnv() {
  return SUPABASE_REQUIRED_KEYS.filter((key) => !process.env[key]);
}

export function hasSupabaseEnv() {
  return getMissingSupabaseEnv().length === 0;
}
