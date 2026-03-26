import { revalidateTag } from "next/cache";
import { fetchExternalEventsAction } from "@/app/actions/external-events";

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
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  revalidateTag("external-events", "max");
  const events = await fetchExternalEventsAction();

  return Response.json({
    ok: true,
    refreshedAt: new Date().toISOString(),
    count: events.length,
  });
}
