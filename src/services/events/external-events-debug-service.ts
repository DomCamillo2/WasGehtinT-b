import { fetchExternalEventsAction } from "@/app/actions/external-events";

export type ExternalEventDebugItem = {
  id: string;
  title: string;
  startsAt: string;
  vibeLabel: string;
};

export async function loadExternalEventsDebugItems(): Promise<ExternalEventDebugItem[]> {
  const events = await fetchExternalEventsAction();

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.starts_at,
    vibeLabel: event.vibe_label,
  }));
}
