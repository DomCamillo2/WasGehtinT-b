import { revalidatePath, revalidateTag } from "next/cache";
import { syncExternalEventsToCache } from "@/lib/external-events-cache";
import { externalEventsFetchStaleSourceKeys } from "@/lib/external-event-sources";
import { cronSecretMatches, normalizeEnvSecret } from "@/lib/cron-auth";
import { safeEqualString } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchExternalEvents } from "@/services/events/external-events-fetch-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const REFRESH_COOLDOWN_MINUTES = (() => {
  const parsed = Number(process.env.EXTERNAL_EVENTS_REFRESH_COOLDOWN_MINUTES ?? "10");
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 10;
  }
  return Math.floor(parsed);
})();

function isAuthorized(request: Request) {
  if (cronSecretMatches(request)) {
    return true;
  }

  const expected = normalizeEnvSecret(process.env.EXTERNAL_EVENTS_REFRESH_TOKEN);
  if (!expected) {
    return false;
  }

  // Header-only — never accept ?token= (logs / Referer leakage).
  const headerToken = request.headers.get("x-refresh-token")?.trim() ?? "";
  return headerToken.length > 0 && safeEqualString(headerToken, expected);
}

export async function GET(request: Request) {
  const startedAt = Date.now();

  if (!isAuthorized(request)) {
    return Response.json(
      { ok: false, error: "unauthorized" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    if (REFRESH_COOLDOWN_MINUTES > 0) {
      const supabase = getSupabaseAdmin();
      const officialSources = externalEventsFetchStaleSourceKeys();
      const lastRunResult = await supabase
        .from("external_events_cache")
        .select("scraped_at")
        .in("source", officialSources)
        .order("scraped_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastRunResult.error && lastRunResult.data?.scraped_at) {
        const lastRunMs = new Date(lastRunResult.data.scraped_at).getTime();
        const cooldownMs = REFRESH_COOLDOWN_MINUTES * 60 * 1000;
        if (Number.isFinite(lastRunMs) && Date.now() - lastRunMs < cooldownMs) {
          return Response.json({
            ok: true,
            skipped: true,
            reason: "cooldown-active",
            cooldownMinutes: REFRESH_COOLDOWN_MINUTES,
            lastRunAt: lastRunResult.data.scraped_at,
            durationMs: Date.now() - startedAt,
          }, {
            status: 200,
            headers: {
              "Cache-Control": "no-store",
            },
          });
        }
      }
    }

    revalidateTag("external-events", "max");
    revalidateTag("discover-public", "max");
    const events = await fetchExternalEvents();
    const syncResult = await syncExternalEventsToCache(events);
    revalidatePath("/discover");
    revalidatePath("/");

    if (syncResult.usedBaseFallback) {
      console.warn(
        "[external-events-refresh] Sync completed with base-row fallback because extended columns were unavailable.",
      );
    }

    return Response.json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      count: events.length,
      upserted: syncResult.upserted,
      usedBaseFallback: syncResult.usedBaseFallback,
      durationMs: Date.now() - startedAt,
    }, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[external-events-refresh] Refresh failed:", error);

    return Response.json(
      {
        ok: false,
        error: "refresh_failed",
        durationMs: Date.now() - startedAt,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
