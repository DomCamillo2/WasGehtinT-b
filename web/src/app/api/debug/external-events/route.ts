import { fetchExternalEvents } from "@/services/events/external-events-fetch-service";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
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
