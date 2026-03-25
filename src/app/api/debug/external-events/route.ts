import { fetchExternalEventsAction } from "@/app/actions/external-events";

export async function GET() {
  try {
    const events = await fetchExternalEventsAction();
    return Response.json({ events, count: events.length }, { status: 200 });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
