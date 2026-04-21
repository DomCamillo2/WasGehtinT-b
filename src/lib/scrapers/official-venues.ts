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
const DIGINIGHTS_ENABLED = (process.env.EXTERNAL_EVENTS_ENABLE_DIGINIGHTS ?? "false").trim().toLowerCase() === "true";
const SCHLACHTHAUS_URL = "https://www.schlachthaus-tuebingen.de/";
const EPPLEHAUS_ICAL_URL = "https://www.epplehaus.de/events/?ical=1";
const TUEBINGEN_MARKETS_URL = "https://www.tuebingen.de/3393.html";
const TUEBINGEN_FLEA_MARKETS_URL = "https://www.tuebingen.de/3392.html";

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

function normalizeGermanWord(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseGermanMonthName(name: string): number | null {
  const normalized = normalizeGermanWord(name);
  const months: Record<string, number> = {
    januar: 1,
    februar: 2,
    marz: 3,
    april: 4,
    mai: 5,
    juni: 6,
    juli: 7,
    august: 8,
    september: 9,
    oktober: 10,
    november: 11,
    dezember: 12,
  };

  return months[normalized] ?? null;
}

function buildBerlinIsoDate(year: number, month: number, day: number, hour = 9, minute = 0): string | null {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const min = String(minute).padStart(2, "0");
  const date = new Date(`${year}-${mm}-${dd}T${hh}:${min}:00+02:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractDateRangeFromLabel(label: string): { startsAt: string; endsAt: string } | null {
  const normalized = String(label ?? "").replace(/\u00a0/g, " ").trim();

  const sameMonthRange = normalized.match(
    /^(\d{1,2})\.\s*(?:und|bis)\s*(\d{1,2})\.\s*([A-Za-zÄÖÜäöüß]+)\s*(\d{4})/i,
  );
  if (sameMonthRange) {
    const [, startDayRaw, endDayRaw, monthName, yearRaw] = sameMonthRange;
    const month = parseGermanMonthName(monthName);
    if (!month) {
      return null;
    }

    const year = Number(yearRaw);
    const startDay = Number(startDayRaw);
    const endDay = Number(endDayRaw);
    const startsAt = buildBerlinIsoDate(year, month, startDay, 9, 0);
    const endsAt = buildBerlinIsoDate(year, month, endDay, 18, 0);
    return startsAt && endsAt ? { startsAt, endsAt } : null;
  }

  const singleDay = normalized.match(/^(\d{1,2})\.\s*([A-Za-zÄÖÜäöüß]+)\s*(\d{4})/i);
  if (singleDay) {
    const [, dayRaw, monthName, yearRaw] = singleDay;
    const month = parseGermanMonthName(monthName);
    if (!month) {
      return null;
    }

    const year = Number(yearRaw);
    const day = Number(dayRaw);
    const startsAt = buildBerlinIsoDate(year, month, day, 9, 0);
    const endsAt = buildBerlinIsoDate(year, month, day, 18, 0);
    return startsAt && endsAt ? { startsAt, endsAt } : null;
  }

  return null;
}

function sanitizeMarketTitle(raw: string): string {
  return String(raw ?? "")
    .replace(/^\d{1,2}\.\s*(?:und|bis)\s*\d{1,2}\.\s*[A-Za-zÄÖÜäöüß]+\s*\d{4}:\s*/i, "")
    .replace(/^\d{1,2}\.\s*[A-Za-zÄÖÜäöüß]+\s*\d{4}:\s*/i, "")
    .trim();
}

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
  const normalizedLine = String(line ?? "").replace(/\s+/g, " ").trim();
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

    const lines = collectSchlachthausCandidateLines($);
    console.log("Schlachthaus: Searching through", lines.length, "candidate lines");

    let eventCount = 0;
    const uniqueEventIds = new Set<string>();
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    for (const line of lines) {
      if (eventCount >= 10) {
        break;
      }

      const parsed = parseSchlachthausLine(line);
      if (!parsed) {
        continue;
      }

      const { day, month, title, hour, minute } = parsed;

      let eventDate = new Date(Date.UTC(currentYear, month - 1, day, hour, minute, 0));
      if (eventDate < tenDaysAgo) {
        eventDate = new Date(Date.UTC(currentYear + 1, month - 1, day, hour, minute, 0));
      }

      if (eventDate < tenDaysAgo) {
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
      } as PartyCard);
      eventCount += 1;
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
  if (!DIGINIGHTS_ENABLED) {
    console.warn("Diginights scraper disabled via EXTERNAL_EVENTS_ENABLE_DIGINIGHTS=false.");
    return [];
  }

  try {
    const response = await fetch(DIGINIGHTS_URL, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (response.status === 404) {
      console.warn("Diginights source returned 404. Keeping source disabled for this run.");
      return [];
    }

    if (!response.ok) {
      console.warn("Diginights fetch failed with status:", response.status);
      return [];
    }

    // Source endpoint currently unreliable; keep non-failing no-op behavior until replacement scraper is added.
    console.warn("Diginights endpoint reachable but parser is intentionally inactive.");
    return [];
  } catch (error) {
    console.error("Error checking Diginights source:", error);
    return [];
  }
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

export async function fetchTuebingenMarketEvents(): Promise<PartyCard[]> {
  try {
    const response = await fetch(TUEBINGEN_MARKETS_URL, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.warn("Tuebingen markets fetch failed with status:", response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    return $(".klappe a.kl")
      .toArray()
      .map((element) => {
        const rawLabel = $(element).text().trim();
        const parsedRange = extractDateRangeFromLabel(rawLabel);
        if (!rawLabel || !parsedRange) {
          return null;
        }

        const title = sanitizeMarketTitle(rawLabel) || "Markt in Tübingen";
        const relativeHref = $(element).attr("href")?.trim() ?? "";
        const externalLink = relativeHref
          ? new URL(relativeHref, TUEBINGEN_MARKETS_URL).toString()
          : TUEBINGEN_MARKETS_URL;

        return {
          id: `tuebingen-market-${slugify(rawLabel)}`,
          title,
          description: "Offizieller Markttermin der Universitätsstadt Tübingen",
          starts_at: parsedRange.startsAt,
          ends_at: parsedRange.endsAt,
          max_guests: 0,
          contribution_cents: 0,
          public_lat: null,
          public_lng: null,
          is_external: true,
          external_link: externalLink,
          vibe_label: "Markt",
          spots_left: 0,
          location_name: title.toLowerCase().includes("rathaus") ? "Rathaus, Tübingen" : "Tübingen",
          category_slug: "market",
          category_label: "Markt",
          event_scope: "daytime",
          is_all_day: true,
          audience_label: "Alle",
          price_info: null,
        } as PartyCard;
      })
      .filter((event): event is PartyCard => Boolean(event));
  } catch (error) {
    console.error("Error fetching Tuebingen market events:", error);
    return [];
  }
}

export async function fetchTuebingenFleaMarketEvents(): Promise<PartyCard[]> {
  try {
    const response = await fetch(TUEBINGEN_FLEA_MARKETS_URL, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.warn("Tuebingen flea market fetch failed with status:", response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const yearHeading = $("#content h4")
      .toArray()
      .find((element) => /Termine\s+fuer\s+\d{4}|Termine\s+für\s+\d{4}/i.test($(element).text()));

    if (!yearHeading) {
      return [];
    }

    const yearMatch = $(yearHeading).text().match(/(\d{4})/);
    const year = Number(yearMatch?.[1] ?? "0");
    if (!year) {
      return [];
    }

    const list = $(yearHeading).nextAll("ul").first();
    if (!list.length) {
      return [];
    }

    return list
      .find("li")
      .toArray()
      .map((element) => {
        const raw = $(element).text().replace(/\(.*?\)/g, "").trim();
        const match = raw.match(/^(\d{1,2})\.\s*([A-Za-zÄÖÜäöüß]+)/i);
        if (!match) {
          return null;
        }

        const day = Number(match[1]);
        const month = parseGermanMonthName(match[2]);
        if (!month) {
          return null;
        }

        const startsAt = buildBerlinIsoDate(year, month, day, 8, 0);
        const endsAt = buildBerlinIsoDate(year, month, day, 15, 0);
        if (!startsAt || !endsAt) {
          return null;
        }

        return {
          id: `tuebingen-flohmarkt-${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          title: "Städtischer Flohmarkt in der Uhlandstraße",
          description: "Offizieller Flohmarkttermin der Universitätsstadt Tübingen",
          starts_at: startsAt,
          ends_at: endsAt,
          max_guests: 0,
          contribution_cents: 0,
          public_lat: null,
          public_lng: null,
          is_external: true,
          external_link: TUEBINGEN_FLEA_MARKETS_URL,
          vibe_label: "Flohmarkt",
          spots_left: 0,
          location_name: "Uhlandstraße, Tübingen",
          category_slug: "flea-market",
          category_label: "Flohmarkt",
          event_scope: "daytime",
          is_all_day: false,
          audience_label: "Alle",
          price_info: null,
        } as PartyCard;
      })
      .filter((event): event is PartyCard => Boolean(event));
  } catch (error) {
    console.error("Error fetching Tuebingen flea market events:", error);
    return [];
  }
}
