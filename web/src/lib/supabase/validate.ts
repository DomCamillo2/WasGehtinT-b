/**
 * Validation of Supabase admin client configuration.
 */
import { getSupabaseAdminKey } from "@/lib/env";

export function validateSupabaseAdminConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL fehlt.");
  }

  if (!getSupabaseAdminKey()?.trim()) {
    errors.push("SUPABASE_SECRET_KEY oder SUPABASE_SERVICE_ROLE_KEY fehlt.");
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
