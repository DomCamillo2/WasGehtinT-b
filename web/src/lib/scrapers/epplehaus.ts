import { ExternalSourceFetchError, fetchSourceText } from "@/lib/scrapers/source-fetch";
import { TUEBINGEN_VENUE_COORDS } from "@/lib/tuebingen-venues";
import { PartyCard } from "@/lib/types";
import {
  EPPLEHAUS_ICAL_URL,
  decodeIcsText,
  parseIcsDate,
  slugify,
  unfoldIcsLines,
} from "@/lib/scrapers/shared";

export async function fetchEpplehausEvents(): Promise<PartyCard[]> {
  try {
    const ics = await fetchSourceText("epplehaus", EPPLEHAUS_ICAL_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const lines = unfoldIcsLines(ics);
    const rawEvents: Array<Record<string, string>> = [];
    let currentEvent: Record<string, string> | null = null;

    for (const line of lines) {
      if (line === "BEGIN:VEVENT") {
        currentEvent = {};
        continue;
      }

      if (line === "END:VEVENT") {
        if (currentEvent) {
          rawEvents.push(currentEvent);
        }
        currentEvent = null;
        continue;
      }

      if (!currentEvent) {
        continue;
      }

      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).split(";")[0];
      currentEvent[key] = line.slice(separatorIndex + 1);
    }

    return rawEvents
      .map((event) => {
        const title = decodeIcsText(event.SUMMARY ?? "");
        const description = decodeIcsText(event.DESCRIPTION ?? "");
        const startsAt = parseIcsDate(event.DTSTART ?? "");
        const endsAt =
          parseIcsDate(event.DTEND ?? "") ??
          (startsAt ? new Date(new Date(startsAt).getTime() + 4 * 60 * 60 * 1000).toISOString() : null);
        const externalLink = String(event.URL ?? "").trim() || EPPLEHAUS_ICAL_URL;
        const uid = String(event.UID ?? "").trim();

        if (!title || !startsAt || !endsAt || !uid) {
          return null;
        }

        return {
          id: `epplehaus-${slugify(uid.replace(/@.*/, ""))}`,
          source: "epplehaus",
          title,
          description: description || "Event im Epplehaus, Tübingen",
          starts_at: startsAt,
          ends_at: endsAt,
          max_guests: 0,
          contribution_cents: 0,
          public_lat: TUEBINGEN_VENUE_COORDS.epplehaus.lat,
          public_lng: TUEBINGEN_VENUE_COORDS.epplehaus.lng,
          is_external: true,
          external_link: externalLink,
          vibe_label: "Epplehaus",
          spots_left: 0,
          location_name: "Epplehaus",
        } as PartyCard;
      })
      .filter((event): event is PartyCard => Boolean(event));
  } catch (error) {
    if (error instanceof ExternalSourceFetchError) throw error;
    console.error("Error fetching Epplehaus events:", error);
    throw new ExternalSourceFetchError(
      "epplehaus",
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}

