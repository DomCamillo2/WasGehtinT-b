import { fetchExternalEvents } from "@/services/events/external-events-fetch-service";

export type ExternalEventDebugItem = {
  id: string;
  title: string;
  startsAt: string;
  vibeLabel: string;
};

export async function loadExternalEventsDebugItems(): Promise<ExternalEventDebugItem[]> {
  const events = await fetchExternalEvents();

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.starts_at,
    vibeLabel: event.vibe_label,
  }));
}
