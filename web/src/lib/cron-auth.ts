/** Strip accidental wrapping quotes from env secrets (common after `vercel env pull`). */
export function normalizeEnvSecret(value: string | undefined | null): string {
  const trimmed = value?.trim() ?? "";
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function cronSecretMatches(request: Request, secretRaw?: string | null): boolean {
  const secret = normalizeEnvSecret(secretRaw ?? process.env.CRON_SECRET);
  if (!secret) return false;

  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}
