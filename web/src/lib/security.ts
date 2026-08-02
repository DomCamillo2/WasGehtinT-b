import { timingSafeEqual } from "node:crypto";

/** Strip wrapping quotes and accidental trailing newlines from env secrets. */
export function normalizeEnvSecret(value: string | undefined | null): string {
  let trimmed = value?.trim() ?? "";
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  // Common after vercel env pull / dashboard paste
  trimmed = trimmed.replace(/\\n$/g, "").replace(/\n$/g, "").trim();
  return trimmed;
}

export function safeEqualString(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Only allow same-origin relative paths. Blocks //evil.com, /\evil, and absolute URLs.
 */
export function safeInternalPath(raw: string, fallback = "/discover"): string {
  const value = raw.trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes("://") || value.includes("\\")) return fallback;
  // Disallow control chars / CRLF injection into Location
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}

/** Escape JSON for embedding inside <script type="application/ld+json">. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

/**
 * Best-effort in-memory rate limit (per isolate). Suitable as a first line of defense
 * on Vercel serverless; not a global distributed limiter.
 */
export function consumeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) {
    return false;
  }
  existing.count += 1;
  return true;
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export function isSameOriginRequest(request: Request): boolean {
  const host = request.headers.get("host")?.toLowerCase();
  const origin = request.headers.get("origin");

  if (origin && host) {
    try {
      return new URL(origin).host.toLowerCase() === host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer && host) {
    try {
      return new URL(referer).host.toLowerCase() === host;
    } catch {
      return false;
    }
  }

  // Non-browser clients without Origin/Referer are rejected for browser-facing APIs.
  return false;
}
