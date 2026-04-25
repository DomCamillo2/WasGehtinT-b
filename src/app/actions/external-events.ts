"use server";

import { PartyCard } from "@/lib/types";
import { fetchExternalEvents } from "@/services/events/external-events-fetch-service";

export async function fetchExternalEventsAction(): Promise<PartyCard[]> {
  return fetchExternalEvents();
}
