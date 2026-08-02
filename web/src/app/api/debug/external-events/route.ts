import { fetchExternalEvents } from "@/services/events/external-events-fetch-service";
import { cronSecretMatches } from "@/lib/cron-auth";

function isAuthorized(request: Request): boolean {
  return cronSecretMatches(request);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const events = await fetchExternalEvents();
    return Response.json({ ok: true, events, count: events.length }, { status: 200 });
  } catch (error) {
    console.error("[api/debug/external-events] Failed:", error);
    return Response.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }
}
