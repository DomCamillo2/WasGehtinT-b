import { normalizeEnvSecret, safeEqualString } from "@/lib/security";

export { normalizeEnvSecret } from "@/lib/security";

/**
 * Authorize cron/ops endpoints via Authorization: Bearer <CRON_SECRET>.
 * Query-string secrets are disabled by default (leak into logs/Referer).
 * Set ENABLE_QUERY_CRON_SECRET=true only for legacy callers.
 */
export function cronSecretMatches(request: Request, secretRaw?: string | null): boolean {
  const secret = normalizeEnvSecret(secretRaw ?? process.env.CRON_SECRET);
  if (!secret) return false;

  const authHeader = request.headers.get("authorization")?.trim() ?? "";
  const bearerPrefix = "Bearer ";
  if (authHeader.startsWith(bearerPrefix)) {
    const token = authHeader.slice(bearerPrefix.length).trim();
    if (safeEqualString(token, secret)) {
      return true;
    }
  }

  const allowQuery =
    (process.env.ENABLE_QUERY_CRON_SECRET ?? "").trim().toLowerCase() === "true";
  if (!allowQuery) {
    return false;
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret")?.trim() ?? "";
  return querySecret.length > 0 && safeEqualString(querySecret, secret);
}
