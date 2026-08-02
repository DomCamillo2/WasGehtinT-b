import {
  berlinDayKeyFromDate,
  berlinWallTimeToUtc,
  resolveYearlessBerlinDate,
} from "@/lib/timezone-berlin";
import {
  TUEBINGEN_VENUE_COORDS,
} from "@/lib/tuebingen-venues";

// Feste Koordinaten für Tübinger Venues (legacy keys kept for Schlachthaus scraper)
export const VENUE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  schlachthaus: TUEBINGEN_VENUE_COORDS.schlachthaus,
  "blauer turm": TUEBINGEN_VENUE_COORDS.blauerTurm,
  top10: TUEBINGEN_VENUE_COORDS.top10,
  sudhaus: TUEBINGEN_VENUE_COORDS.sudhaus,
};

export const DIGINIGHTS_URL = (process.env.DIGINIGHTS_URL || process.env.DIGINIGHTS_URLS?.split(",")[0] || "https://diginights.com").trim();
export const DIGINIGHTS_DISABLED =
  (process.env.EXTERNAL_EVENTS_ENABLE_DIGINIGHTS ?? "true").trim().toLowerCase() === "false";
export const SCHLACHTHAUS_URL = "https://www.schlachthaus-tuebingen.de/";
export const EPPLEHAUS_ICAL_URL = "https://www.epplehaus.de/events/?ical=1";
export const TUEBINGEN_MARKETS_URL = "https://www.tuebingen.de/3393.html";
export const TUEBINGEN_FLEA_MARKETS_URL = "https://www.tuebingen.de/3392.html";
export const UNI_EVENTS_URL = "https://uni-tuebingen.de/universitaet/aktuelles-und-publikationen/veranstaltungskalender/";
export const SUDHAUS_URL = "https://www.sudhaus-tuebingen.de/programm/alle.html";
export const CLUB_VOLTAIRE_URL = "https://club-voltaire.net/kalender/";
export const DAI_URL = "https://www.dai-tuebingen.de/veranstaltungen/";
export const PARTYKEL_URL = "https://www.partykel.info/events/day/events/";
export const REDDIT_SUBREDDITS = (process.env.EXTERNAL_EVENTS_REDDIT_SUBREDDITS ?? "tuebingen,reutlingen,stuttgart")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter((value) => value.length > 0);

/**
 * Generate a stable ID for an external event (Berlin calendar day, not UTC).
 */
export function generateEventId(venue: string, date: Date, title: string): string {
  const dateKey = berlinDayKeyFromDate(date) || date.toISOString().split("T")[0];
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${venue.toLowerCase()}-${dateKey}-${titleSlug}`;
}

export function slugify(input: string): string {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function decodeIcsText(value: string): string {
  return String(value ?? "")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

export function unfoldIcsLines(ics: string): string[] {
  return String(ics ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

export function parseIcsDate(value: string): string | null {
  const raw = String(value ?? "").trim();

  // UTC form: 20260315T180000Z
  const utcMatch = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/i);
  if (utcMatch) {
    const [, year, month, day, hour, minute, second] = utcMatch;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  // All-day: 20260315
  const dateOnly = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const date = berlinWallTimeToUtc(`${year}-${month}-${day}`, 12, 0);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  // Local wall clock (Europe/Berlin): 20260315T180000
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const date = berlinWallTimeToUtc(`${year}-${month}-${day}`, Number(hour), Number(minute));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function normalizeGermanWord(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function parseGermanMonthName(name: string): number | null {
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

export function buildBerlinIsoDate(year: number, month: number, day: number, hour = 9, minute = 0): string | null {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const date = berlinWallTimeToUtc(`${year}-${mm}-${dd}`, hour, minute);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function extractDateRangeFromLabel(label: string): { startsAt: string; endsAt: string } | null {
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

export function sanitizeMarketTitle(raw: string): string {
  return String(raw ?? "")
    .replace(/^\d{1,2}\.\s*(?:und|bis)\s*\d{1,2}\.\s*[A-Za-zÄÖÜäöüß]+\s*\d{4}:\s*/i, "")
    .replace(/^\d{1,2}\.\s*[A-Za-zÄÖÜäöüß]+\s*\d{4}:\s*/i, "")
    .trim();
}

export function parseDateTimeFromText(text: string): Date | null {
  const normalized = String(text ?? "").replace(/\u00a0/g, " ").trim();
  const fullMatch = normalized.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[^\d]+(\d{1,2})[:.](\d{2}))?/);
  if (fullMatch) {
    const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw] = fullMatch;
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(yearRaw);
    const hour = Number(hourRaw ?? "19");
    const minute = Number(minuteRaw ?? "00");
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const date = berlinWallTimeToUtc(`${year}-${mm}-${dd}`, hour, minute);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const partialMatch = normalized.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
  if (!partialMatch) {
    return null;
  }

  const day = Number(partialMatch[1]);
  const month = Number(partialMatch[2]);
  const yearRaw = partialMatch[3];

  // Yearless calendar lines (Club Voltaire etc.): never invent next-year ghosts.
  if (!yearRaw) {
    return resolveYearlessBerlinDate(day, month, 19, 0, {
      maxPastMs: 24 * 60 * 60 * 1000,
      maxFutureMs: 100 * 24 * 60 * 60 * 1000,
    });
  }

  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const date = berlinWallTimeToUtc(`${year}-${mm}-${dd}`, 19, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildBerlinIsoDateTime(year: number, month: number, day: number, hour = 19, minute = 0): Date | null {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const date = berlinWallTimeToUtc(`${year}-${mm}-${dd}`, hour, minute);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseRedditEventDate(text: string, createdUtcSeconds: number): Date | null {
  const normalized = String(text ?? "").replace(/\u00a0/g, " ").trim().toLowerCase();
  const now = new Date();
  const maxFutureMs = 120 * 24 * 60 * 60 * 1000;

  const absoluteDate = normalized.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
  if (absoluteDate) {
    const day = Number(absoluteDate[1]);
    const month = Number(absoluteDate[2]);
    if (!yearRawGuard(absoluteDate[3])) {
      // yearless: use shared year-bump guard
      return resolveYearlessBerlinDate(day, month, 19, 0, {
        maxPastMs: 24 * 60 * 60 * 1000,
        maxFutureMs,
      });
    }
    const yearRaw = absoluteDate[3];
    const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
    const parsed = buildBerlinIsoDateTime(year, month, day, 19, 0);
    if (!parsed) return null;
    if (parsed.getTime() > now.getTime() + maxFutureMs) return null;
    if (parsed.getTime() < now.getTime() - 24 * 60 * 60 * 1000) return null;
    return parsed;
  }

  const createdAt = new Date(createdUtcSeconds * 1000);
  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  if (/\bmorgen\b/.test(normalized)) {
    return new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
  }
  if (/\bheute\b/.test(normalized)) {
    return createdAt;
  }

  return null;
}

export function yearRawGuard(yearRaw: string | undefined): yearRaw is string {
  return typeof yearRaw === "string" && yearRaw.length > 0;
}

export function isLikelyRedditEvent(text: string): boolean {
  const normalized = String(text ?? "").toLowerCase();
  const eventPattern = /\b(event|party|rave|konzert|konzertabend|lesung|workshop|ausstellung|theater|vortrag|flohmarkt|kino|veranstaltung|treffen)\b/;
  const timePattern = /(\d{1,2}\.\d{1,2}(\.\d{2,4})?|\b\d{1,2}[:.]\d{2}\b|\bheute\b|\bmorgen\b|\buhr\b)/;
  const excludePattern = /\bwohnung|wg-?zimmer|verkaufe|suche job|arbeitsplatz|praktikum|wohnungssuche\b/;
  return eventPattern.test(normalized) && timePattern.test(normalized) && !excludePattern.test(normalized);
}


export function collectLdJsonEventNodes(root: unknown): unknown[] {
  if (!root || typeof root !== "object") {
    return [];
  }

  const o = root as Record<string, unknown>;
  const graph = o["@graph"];
  if (Array.isArray(graph)) {
    return graph;
  }

  if (ldJsonTypeMatches(o["@type"], "ItemList") && Array.isArray(o.itemListElement)) {
    const nested: unknown[] = [];
    for (const el of o.itemListElement) {
      if (!el || typeof el !== "object") {
        continue;
      }

      const row = el as Record<string, unknown>;
      const item = row.item ?? row;
      nested.push(item);
    }

    return nested;
  }

  return [root];
}

export function ldJsonTypeMatches(types: unknown, needle: string): boolean {
  if (types === needle) {
    return true;
  }

  if (Array.isArray(types)) {
    return types.some((t) => t === needle);
  }

  return false;
}

export const TUEBINGEN_LAT = 48.5216;
export const TUEBINGEN_LNG = 9.0576;
/** ~35 km — covers Tübingen + nearby party towns without national Diginights noise. */
export const TUEBINGEN_RADIUS_KM = 35;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isTuebingenAreaEvent(input: {
  locationName?: string | null;
  addressText?: string | null;
  lat?: number | null;
  lng?: number | null;
  title?: string | null;
  description?: string | null;
}): boolean {
  const haystack = [input.locationName, input.addressText, input.title, input.description]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

  if (/tübingen|tuebingen|tuebing|tübinger|reutlingen/.test(haystack)) {
    return true;
  }

  if (
    typeof input.lat === "number" &&
    typeof input.lng === "number" &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
  ) {
    return haversineKm(TUEBINGEN_LAT, TUEBINGEN_LNG, input.lat, input.lng) <= TUEBINGEN_RADIUS_KM;
  }

  return false;
}

/**
 * Fetch and parse Diginights events for Tübingen (JSON-LD Event / MusicEvent).
 */
