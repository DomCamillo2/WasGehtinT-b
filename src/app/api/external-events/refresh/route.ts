import { revalidatePath, revalidateTag } from "next/cache";
import { syncExternalEventsToCache } from "@/lib/external-events-cache";
import { fetchExternalEvents } from "@/services/events/external-events-fetch-service";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization")?.trim();
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const expected = process.env.EXTERNAL_EVENTS_REFRESH_TOKEN?.trim();

  if (!expected) {
    return false;
  }

  const headerToken = request.headers.get("x-refresh-token")?.trim();
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token")?.trim();

  return headerToken === expected || queryToken === expected;
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

  revalidateTag("external-events", "max");
  const events = await fetchExternalEvents();
  const syncResult = await syncExternalEventsToCache(events);
  revalidatePath("/discover");

  return Response.json({
    ok: true,
    refreshedAt: new Date().toISOString(),
    count: events.length,
    upserted: syncResult.upserted,
    durationMs: Date.now() - startedAt,
  }, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  return GET(request);
}
