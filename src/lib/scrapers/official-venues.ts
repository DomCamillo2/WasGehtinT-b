import * as cheerio from "cheerio";
import { PartyCard } from "@/lib/types";

// Feste Koordinaten für Tübinger Venues
const VENUE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  schlachthaus: { lat: 48.5255, lng: 9.0515 },
  "blauer turm": { lat: 48.5178, lng: 9.0601 },
  top10: { lat: 48.5145, lng: 9.0835 },
  sudhaus: { lat: 48.5065, lng: 9.0625 },
};

const DIGINIGHTS_URL = "https://diginights.com/city/tuebingen";
const SCHLACHTHAUS_URL = "https://www.schlachthaus-tuebingen.de/";
const EPPLEHAUS_ICAL_URL = "https://www.epplehaus.de/events/?ical=1";

/**
 * Parse date strings in various formats
 */
function parseGermanDate(dateStr: string): Date | null {
  dateStr = dateStr.trim();

  // Try DD.MM.YYYY format
  const dotMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 20, 0, 0));
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  // Try "25. Januar 2025" or "25 Januar 2025" format
  const monthNames: Record<string, number> = {
    januar: 1,
    februar: 2,
    märz: 3,
    april: 4,
    mai: 5,
    juni: 6,
    juli: 7,
    august: 8,
    september: 9,
    oktober: 10,
    november: 11,
    dezember: 12,
    january: 1,
    february: 2,
    march: 3,
    may: 5,
    june: 6,
    july: 7,
    october: 10,
    december: 12,
  };

  const textMatch = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (textMatch) {
    const [, day, monthName, year] = textMatch;
    const month = monthNames[monthName.toLowerCase()];
    if (month) {
      const date = new Date(Date.UTC(parseInt(year), month - 1, parseInt(day), 20, 0, 0));
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

/**
 * Generate a stable ID for an external event
 */
function generateEventId(venue: string, date: Date, title: string): string {
  const dateKey = date.toISOString().split("T")[0];
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${venue.toLowerCase()}-${dateKey}-${titleSlug}`;
}

function slugify(input: string): string {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function decodeIcsText(value: string): string {
  return String(value ?? "")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function unfoldIcsLines(ics: string): string[] {
  return String(ics ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

function parseIcsDate(value: string): string | null {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+02:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

/**
 * Find venue coordinates by name
 */
function getVenueCoordinates(venueName: string): { lat: number; lng: number } | null {
  const normalized = venueName.toLowerCase().trim();
  for (const [key, coords] of Object.entries(VENUE_COORDINATES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }
  return null;
}

/**
 * Fetch and parse Schlachthaus events (limit to next 5)
 */
export async function fetchSchlachthausEvents(): Promise<PartyCard[]> {
  try {
    const response = await fetch(SCHLACHTHAUS_URL, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.warn("Schlachthaus fetch failed with status:", response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const events: PartyCard[] = [];

    // Get all text content and split by lines
    const bodyText = $("body").text();
    const lines = bodyText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    console.log("Schlachthaus: Searching through", lines.length, "lines of text");

    // Pattern: "FR 6.3. | TITLE | TIME" or "SA 7.3. | TITLE | TIME"
    const eventPattern = /^(MO|DI|MI|DO|FR|SA|SO)\s+(\d{1,2})\.(\d{1,2})\.\s*\|\s*(.+?)\s*\|\s*(\d{1,2}):(\d{2})/i;

    let eventCount = 0;
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    for (const line of lines) {
      if (eventCount >= 10) break;

      const match = line.match(eventPattern);
      if (!match) {
        continue;
      }

      const [, dayName, dayStr, monthStr, title, hourStr, minStr] = match;
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const hour = parseInt(hourStr, 10);
      const min = parseInt(minStr, 10);

      // Create date for this year
      const eventDate = new Date(Date.UTC(currentYear, month - 1, day, hour, min, 0));

      console.log(`Schlachthaus: Found event: ${dayName} ${day}.${month}. ${title} ${hour}:${String(min).padStart(2, "0")}`);

      // If date is more than 10 days in the past, skip or try next year
      if (eventDate < tenDaysAgo) {
        const eventDateNextYear = new Date(Date.UTC(currentYear + 1, month - 1, day, hour, min, 0));
        if (eventDateNextYear > tenDaysAgo) {
          const eventId = generateEventId("schlachthaus", eventDateNextYear, title);
          events.push({
            id: eventId,
            title: title,
            description: "Schlachthaus Tübingen – Kulturzentrum und Veranstaltungsort",
            starts_at: eventDateNextYear.toISOString(),
            ends_at: new Date(eventDateNextYear.getTime() + 4 * 60 * 60 * 1000).toISOString(),
            max_guests: 0,
            contribution_cents: 0,
            public_lat: VENUE_COORDINATES.schlachthaus.lat,
            public_lng: VENUE_COORDINATES.schlachthaus.lng,
            is_external: true,
            external_link: null,
            vibe_label: "Schlachthaus",
            spots_left: 0,
          } as PartyCard);
          eventCount++;
        }
      } else {
        const eventId = generateEventId("schlachthaus", eventDate, title);
        events.push({
          id: eventId,
          title: title,
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
        } as PartyCard);
        eventCount++;
      }
    }

    console.log("Schlachthaus: Parsed", eventCount, "events");
    return events;
  } catch (error) {
    console.error("Error fetching Schlachthaus events:", error);
    return [];
  }
}

/**
 * Fetch and parse Diginights events for Tübingen
 */
export async function fetchDignightsEvents(): Promise<PartyCard[]> {
  console.warn("Diginights scraper disabled: source currently returns 404.");
  return [];

  /*
  try {
    const response = await fetch(DIGINIGHTS_URL, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const events: PartyCard[] = [];

    // Find all event containers on Diginights
    const eventElements = $(
      'article, [class*="event"], [class*="concert"], [class*="party"], .event-card, [class*="event-item"]'
    )
      .slice(0, 15)
      .toArray();

    for (const element of eventElements) {
      const $elem = $(element);
      const titleElem = $elem.find('h2, h3, h4, .title, [class*="title"]').first();
      const dateElem = $elem
        .find('time, [class*="date"], [class*="time"], .datum')
        .first();
      const venueElem = $elem
        .find('[class*="venue"], [class*="location"], [class*="ort"]')
        .first();

      let title = titleElem.text().trim();
      const dateText = dateElem.attr("datetime") || dateElem.text().trim();
      const venueName = venueElem.text().trim() || "Diginights Tübingen";

      // Check if event mentions Tübingen
      if (!title && !dateText) continue;
      if (!title.toLowerCase().includes("tübingen") && !venueName.toLowerCase().includes("tübingen")) {
        continue;
      }

      // Clean title
      title = title.replace(/\s+/g, " ").trim();
      if (!title) title = venueName || "Diginights Event";

      // Limit title length
      if (title.length > 80) {
        title = title.substring(0, 77) + "...";
      }

      let parsedDate: Date | null = null;

      // Try ISO format first
      if (dateText && dateText.includes("T")) {
        const isoDate = new Date(dateText);
        if (!Number.isNaN(isoDate.getTime()) && isoDate > new Date()) {
          parsedDate = isoDate;
        }
      }

      // Try German date formats
      if (!parsedDate && dateText) {
        parsedDate = parseGermanDate(dateText);
      }

      if (!parsedDate || parsedDate < new Date()) {
        continue;
      }

      // Try to get coordinates from venue name
      const coords = getVenueCoordinates(venueName);
      if (!coords) {
        continue; // Skip if no known venue
      }

      const eventId = generateEventId("diginights", parsedDate, title);

      events.push({
        id: eventId,
        title: title,
        description: `Diginights Event in Tübingen`,
        starts_at: parsedDate.toISOString(),
        ends_at: new Date(parsedDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        max_guests: 0,
        contribution_cents: 0,
        public_lat: coords.lat,
        public_lng: coords.lng,
        is_external: true,
        external_link: null,
        vibe_label: venueName.length > 0 ? venueName : "Diginights",
        spots_left: 0,
      } as PartyCard);
    }

    return events;
  } catch (error) {
    console.error("Error fetching Diginights events:", error);
    return [];
  }
  */
}

export async function fetchEpplehausEvents(): Promise<PartyCard[]> {
  try {
    const response = await fetch(EPPLEHAUS_ICAL_URL, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.warn("Epplehaus fetch failed with status:", response.status);
      return [];
    }

    const ics = await response.text();
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
          title,
          description: description || "Event im Epplehaus, Tübingen",
          starts_at: startsAt,
          ends_at: endsAt,
          max_guests: 0,
          contribution_cents: 0,
          public_lat: null,
          public_lng: null,
          is_external: true,
          external_link: externalLink,
          vibe_label: "Epplehaus",
          spots_left: 0,
          location_name: "Epplehaus",
        } as PartyCard;
      })
      .filter((event): event is PartyCard => Boolean(event));
  } catch (error) {
    console.error("Error fetching Epplehaus events:", error);
    return [];
  }
}
