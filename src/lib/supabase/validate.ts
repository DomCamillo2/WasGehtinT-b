/**
 * Validation of Supabase admin client configuration.
 */
export function validateSupabaseAdminConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL fehlt.");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    errors.push("SUPABASE_SERVICE_ROLE_KEY fehlt.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertSupabaseAdminConfig(): void {
  const { valid, errors } = validateSupabaseAdminConfig();

  if (!valid) {
    throw new Error(`Supabase Admin Config ungültig: ${errors.join(" ")}`);
  }
}
