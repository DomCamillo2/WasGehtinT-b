import * as cheerio from "cheerio";
import { resolveYearlessBerlinDate } from "@/lib/timezone-berlin";
import { ExternalSourceFetchError, fetchSourceText } from "@/lib/scrapers/source-fetch";
import { PartyCard } from "@/lib/types";
import {
  SCHLACHTHAUS_URL,
  VENUE_COORDINATES,
  generateEventId,
} from "@/lib/scrapers/shared";

const SCHLACHTHAUS_EVENT_PATTERN =
  /^(MO|DI|MI|DO|FR|SA|SO)\s+(\d{1,2})\.(\d{1,2})\.\s*(?:\|\s*)?(.+?)(?:\s*\|\s*(\d{1,2})[.:](\d{2}))?$/i;

function collectSchlachthausCandidateLines($: cheerio.CheerioAPI): string[] {
  const headingCandidates = $("h2, h3, h4, h5, h6")
    .toArray()
    .map((node) => $(node).text().replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim())
    .filter((line) => line.length > 0);

  if (headingCandidates.length > 0) {
    return headingCandidates;
  }

  return $("body")
    .text()
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim())
    .filter((line) => line.length > 0);
}

function parseSchlachthausLine(line: string): { day: number; month: number; title: string; hour: number; minute: number } | null {
  const normalizedLine = String(line ?? "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  const match = normalizedLine.match(SCHLACHTHAUS_EVENT_PATTERN);
  if (!match) {
    return null;
  }

  const day = Number(match[2]);
  const month = Number(match[3]);
  const rawTitle = String(match[4] ?? "").replace(/\s*\|\s*$/, "").trim();
  const title = rawTitle.replace(/\s+/g, " ").trim();
  const hour = Number(match[5] ?? "20");
  const minute = Number(match[6] ?? "00");

  if (!title || /geschlossen/i.test(title)) {
    return null;
  }

  if (!Number.isInteger(day) || !Number.isInteger(month) || day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { day, month, title, hour, minute };
}

/**
 * Fetch and parse Schlachthaus events (limit to next 5)
 */
export async function fetchSchlachthausEvents(): Promise<PartyCard[]> {
  try {
    const html = await fetchSourceText("schlachthaus", SCHLACHTHAUS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const $ = cheerio.load(html);
    const events: PartyCard[] = [];

    const lines = collectSchlachthausCandidateLines($);
    console.log("Schlachthaus: Searching through", lines.length, "candidate lines");

    let eventCount = 0;
    const uniqueEventIds = new Set<string>();

    for (const line of lines) {
      if (eventCount >= 10) {
        break;
      }

      const parsed = parseSchlachthausLine(line);
      if (!parsed) {
        continue;
      }

      const { day, month, title, hour, minute } = parsed;

      // Month programs: allow ~10d past, reject year-bumps beyond ~100d (stale July→next year).
      const eventDate = resolveYearlessBerlinDate(day, month, hour, minute, {
        maxPastMs: 10 * 24 * 60 * 60 * 1000,
        maxFutureMs: 100 * 24 * 60 * 60 * 1000,
      });
      if (!eventDate) {
        continue;
      }

      const eventId = generateEventId("schlachthaus", eventDate, title);
      if (uniqueEventIds.has(eventId)) {
        continue;
      }

      uniqueEventIds.add(eventId);
      console.log(`Schlachthaus: Found event ${day}.${month}. ${title} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);

      events.push({
        id: eventId,
        source: "schlachthaus",
        title,
        description: "Schlachthaus Tübingen – Kulturzentrum und Veranstaltungsort",
        starts_at: eventDate.toISOString(),
        ends_at: new Date(eventDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        max_guests: 0,
        contribution_cents: 0,
        public_lat: VENUE_COORDINATES.schlachthaus.lat,
        public_lng: VENUE_COORDINATES.schlachthaus.lng,
        is_external: true,
        external_link: null,
        vibe_label: "Schlachthaus",
        spots_left: 0,
        location_name: "Schlachthaus",
        event_scope: "nightlife",
        category_slug: "party",
        category_label: "Party",
      } as PartyCard);
      eventCount += 1;
    }

    console.log("Schlachthaus: Parsed", eventCount, "events");
    return events;
  } catch (error) {
    if (error instanceof ExternalSourceFetchError) throw error;
    console.error("Error fetching Schlachthaus events:", error);
    throw new ExternalSourceFetchError(
      "schlachthaus",
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}

