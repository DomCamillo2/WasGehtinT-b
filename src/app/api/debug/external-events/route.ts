import { fetchExternalEvents } from "@/services/events/external-events-fetch-service";

export async function GET() {
  try {
    const events = await fetchExternalEvents();
    return Response.json({ events, count: events.length }, { status: 200 });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
