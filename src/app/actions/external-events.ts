"use server";

import { PartyCard } from "@/lib/types";
import { fetchExternalEvents } from "@/services/events/external-events-fetch-service";

export type FetchExternalEventsActionResult = {
  ok: true;
  events: PartyCard[];
  count: number;
};

export async function fetchExternalEventsAction(): Promise<FetchExternalEventsActionResult> {
  const events = await fetchExternalEvents();

  return {
    ok: true,
    events,
    count: events.length,
  };
}
