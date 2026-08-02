import * as cheerio from "cheerio";
import { berlinWallTimeToUtc, resolveYearlessBerlinDate } from "@/lib/timezone-berlin";
import { sanitizeExternalEventTitle } from "@/lib/sanitize-event-title";
import {
  resolveTuebingenVenueCoordsFromText,
  TUEBINGEN_VENUE_COORDS,
} from "@/lib/tuebingen-venues";
import { PartyCard } from "@/lib/types";

// Feste Koordinaten für Tübinger Venues (legacy keys kept for Schlachthaus scraper)
const VENUE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  schlachthaus: TUEBINGEN_VENUE_COORDS.schlachthaus,
  "blauer turm": TUEBINGEN_VENUE_COORDS.blauerTurm,
  top10: TUEBINGEN_VENUE_COORDS.top10,
  sudhaus: TUEBINGEN_VENUE_COORDS.sudhaus,
};

const DIGINIGHTS_URL = (process.env.DIGINIGHTS_URL || process.env.DIGINIGHTS_URLS?.split(",")[0] || "https://diginights.com").trim();
const DIGINIGHTS_DISABLED =
  (process.env.EXTERNAL_EVENTS_ENABLE_DIGINIGHTS ?? "true").trim().toLowerCase() === "false";
const SCHLACHTHAUS_URL = "https://www.schlachthaus-tuebingen.de/";
const EPPLEHAUS_ICAL_URL = "https://www.epplehaus.de/events/?ical=1";
const TUEBINGEN_MARKETS_URL = "https://www.tuebingen.de/3393.html";
const TUEBINGEN_FLEA_MARKETS_URL = "https://www.tuebingen.de/3392.html";
const UNI_EVENTS_URL = "https://uni-tuebingen.de/universitaet/aktuelles-und-publikationen/veranstaltungskalender/";
const SUDHAUS_URL = "https://www.sudhaus-tuebingen.de/programm/alle.html";
const CLUB_VOLTAIRE_URL = "https://club-voltaire.net/kalender/";
const DAI_URL = "https://www.dai-tuebingen.de/veranstaltungen/";
const PARTYKEL_URL = "https://www.partykel.info/events/day/events/";
const REDDIT_SUBREDDITS = (process.env.EXTERNAL_EVENTS_REDDIT_SUBREDDITS ?? "tuebingen,reutlingen,stuttgart")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter((value) => value.length > 0);

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
  const date = berlinWallTimeToUtc(`${year}-${mm}-${dd}`, hour, minute);
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

function parseDateTimeFromText(text: string): Date | null {
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

function buildBerlinIsoDateTime(year: number, month: number, day: number, hour = 19, minute = 0): Date | null {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const date = berlinWallTimeToUtc(`${year}-${mm}-${dd}`, hour, minute);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRedditEventDate(text: string, createdUtcSeconds: number): Date | null {
  const normalized = String(text ?? "").replace(/\u00a0/g, " ").trim().toLowerCase();
  const now = new Date();

  const absoluteDate = normalized.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
  if (absoluteDate) {
    const day = Number(absoluteDate[1]);
    const month = Number(absoluteDate[2]);
    const yearRaw = absoluteDate[3];
    const year = yearRaw ? (yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw)) : now.getFullYear();
    let parsed = buildBerlinIsoDateTime(year, month, day, 19, 0);
    if (!parsed) {
      return null;
    }
    if (!yearRaw && parsed.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      parsed = buildBerlinIsoDateTime(year + 1, month, day, 19, 0);
    }
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

function isLikelyRedditEvent(text: string): boolean {
  const normalized = String(text ?? "").toLowerCase();
  const eventPattern = /\b(event|party|rave|konzert|konzertabend|lesung|workshop|ausstellung|theater|vortrag|flohmarkt|kino|veranstaltung|treffen)\b/;
  const timePattern = /(\d{1,2}\.\d{1,2}(\.\d{2,4})?|\b\d{1,2}[:.]\d{2}\b|\bheute\b|\bmorgen\b|\buhr\b)/;
  const excludePattern = /\bwohnung|wg-?zimmer|verkaufe|suche job|arbeitsplatz|praktikum|wohnungssuche\b/;
  return eventPattern.test(normalized) && timePattern.test(normalized) && !excludePattern.test(normalized);
}

async function fetchGenericCalendarEvents(config: {
  source: string;
  url: string;
  vibeLabel: string;
  locationName: string;
  categoryLabel: string;
  categorySlug: string;
  scope?: "daytime" | "nightlife" | "mixed";
  selectors?: string[];
  publicLat?: number | null;
  publicLng?: number | null;
}): Promise<PartyCard[]> {
  const resolved =
    Number.isFinite(config.publicLat) && Number.isFinite(config.publicLng)
      ? { lat: Number(config.publicLat), lng: Number(config.publicLng) }
      : resolveTuebingenVenueCoordsFromText(`${config.locationName} ${config.vibeLabel}`)?.coords ??
        null;
  const publicLat = resolved?.lat ?? null;
  const publicLng = resolved?.lng ?? null;
  try {
    const response = await fetch(config.url, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.warn(`${config.source} fetch failed with status:`, response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const now = Date.now();
    const events: PartyCard[] = [];
    const seenIds = new Set<string>();

    // Prefer structured Event JSON-LD when present (Club Voltaire calendar, etc.).
    $("script[type=\"application/ld+json\"]").each((_, el) => {
      const raw = $(el).html();
      if (!raw) return;

      let data: unknown;
      try {
        data = JSON.parse(raw.trim());
      } catch {
        return;
      }

      const roots = Array.isArray(data) ? data : [data];
      for (const root of roots) {
        for (const node of collectLdJsonEventNodes(root)) {
          if (!node || typeof node !== "object") continue;
          const item = node as Record<string, unknown>;
          const typeField = item["@type"];
          if (!ldJsonTypeMatches(typeField, "Event") && !ldJsonTypeMatches(typeField, "MusicEvent")) {
            continue;
          }

          const name = String(item.name ?? "").trim();
          if (!name || name.length < 2) continue;

          const startRaw = item.startDate;
          const startStr = typeof startRaw === "string" ? startRaw : null;
          if (!startStr) continue;
          const startsAtDate = new Date(startStr);
          if (Number.isNaN(startsAtDate.getTime())) continue;
          if (startsAtDate.getTime() < now - 24 * 60 * 60 * 1000) continue;
          if (startsAtDate.getTime() > now + 160 * 24 * 60 * 60 * 1000) continue;

          let endsAtMs = startsAtDate.getTime() + 2 * 60 * 60 * 1000;
          if (typeof item.endDate === "string") {
            const parsedEnd = new Date(item.endDate);
            if (!Number.isNaN(parsedEnd.getTime()) && parsedEnd.getTime() > startsAtDate.getTime()) {
              endsAtMs = parsedEnd.getTime();
            }
          }

          const urlField = item.url;
          const externalLink =
            typeof urlField === "string" && urlField.startsWith("http") ? urlField : config.url;

          const eventId = generateEventId(config.source, startsAtDate, name);
          if (seenIds.has(eventId)) continue;
          seenIds.add(eventId);

          const fallbackDescription = `${config.locationName} – ${config.categoryLabel}`;
          const rawDescription =
            typeof item.description === "string" && item.description.trim().length > 0
              ? item.description
              : fallbackDescription;
          const plainDescription = String(rawDescription)
            .replace(/<[^>]+>/g, " ")
            .replace(/&[a-z#0-9]+;/gi, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 280);

          events.push({
            id: eventId,
            source: config.source,
            title: sanitizeExternalEventTitle(name, {
              description: plainDescription || fallbackDescription,
              externalLink,
              fallback: config.vibeLabel,
            }).slice(0, 140),
            description: plainDescription || fallbackDescription,
            starts_at: startsAtDate.toISOString(),
            ends_at: new Date(endsAtMs).toISOString(),
            max_guests: 0,
            contribution_cents: 0,
            public_lat: publicLat,
            public_lng: publicLng,
            is_external: true,
            external_link: externalLink,
            vibe_label: config.vibeLabel,
            spots_left: 0,
            location_name: config.locationName,
            category_slug: config.categorySlug,
            category_label: config.categoryLabel,
            event_scope: config.scope ?? "daytime",
            is_all_day: false,
            audience_label: "Alle",
            price_info: null,
          } as PartyCard);
        }
      }
    });

    if (events.length > 0) {
      return events
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, 40);
    }

    const selectors = config.selectors ?? [
      "article",
      ".event",
      ".veranstaltung",
      ".calendar-entry",
      "li",
    ];

    const candidates = new Set<string>();
    for (const selector of selectors) {
      $(selector)
        .toArray()
        .forEach((node) => {
          const text = $(node).text().replace(/\s+/g, " ").trim();
          if (text.length >= 24 && text.length <= 400) {
            candidates.add(text);
          }
        });
    }

    for (const candidate of Array.from(candidates).slice(0, 120)) {
      const startsAtDate = parseDateTimeFromText(candidate);
      if (!startsAtDate) continue;
      if (startsAtDate.getTime() < now - 24 * 60 * 60 * 1000) continue;
      if (startsAtDate.getTime() > now + 160 * 24 * 60 * 60 * 1000) continue;

      const title = candidate
        .replace(/^\d{1,2}\.\d{1,2}\.(\d{2,4})?\s*[|:-]?\s*/g, "")
        .replace(/\b\d{1,2}[:.]\d{2}\b/g, "")
        .trim()
        .slice(0, 120);
      if (!title || title.length < 4) continue;

      const eventId = generateEventId(config.source, startsAtDate, title);
      if (seenIds.has(eventId)) continue;
      seenIds.add(eventId);

      events.push({
        id: eventId,
        source: config.source,
        title,
        description: `${config.locationName} – ${config.categoryLabel}`,
        starts_at: startsAtDate.toISOString(),
        ends_at: new Date(startsAtDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        max_guests: 0,
        contribution_cents: 0,
        public_lat: publicLat,
        public_lng: publicLng,
        is_external: true,
        external_link: config.url,
        vibe_label: config.vibeLabel,
        spots_left: 0,
        location_name: config.locationName,
        category_slug: config.categorySlug,
        category_label: config.categoryLabel,
        event_scope: config.scope ?? "daytime",
        is_all_day: false,
        audience_label: "Alle",
        price_info: null,
      } as PartyCard);
    }

    return events.slice(0, 40);
  } catch (error) {
    console.error(`Error fetching ${config.source} events:`, error);
    return [];
  }
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
    console.error("Error fetching Schlachthaus events:", error);
    return [];
  }
}

function collectLdJsonEventNodes(root: unknown): unknown[] {
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

function ldJsonTypeMatches(types: unknown, needle: string): boolean {
  if (types === needle) {
    return true;
  }

  if (Array.isArray(types)) {
    return types.some((t) => t === needle);
  }

  return false;
}

const TUEBINGEN_LAT = 48.5216;
const TUEBINGEN_LNG = 9.0576;
/** ~35 km — covers Tübingen + nearby party towns without national Diginights noise. */
const TUEBINGEN_RADIUS_KM = 35;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isTuebingenAreaEvent(input: {
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
export async function fetchDignightsEvents(): Promise<PartyCard[]> {
  if (DIGINIGHTS_DISABLED) {
    console.warn("Diginights scraper disabled via EXTERNAL_EVENTS_ENABLE_DIGINIGHTS=false.");
    return [];
  }

  try {
    const response = await fetch(DIGINIGHTS_URL, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (response.status === 404) {
      console.warn("Diginights source returned 404.");
      return [];
    }

    if (!response.ok) {
      console.warn("Diginights fetch failed with status:", response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const events: PartyCard[] = [];
    const seen = new Set<string>();
    const nowMs = Date.now();

    $("script[type=\"application/ld+json\"]").each((_, el) => {
      const raw = $(el).html();
      if (!raw) {
        return;
      }

      let data: unknown;
      try {
        data = JSON.parse(raw.trim());
      } catch {
        return;
      }

      const roots = Array.isArray(data) ? data : [data];
      for (const root of roots) {
        for (const node of collectLdJsonEventNodes(root)) {
          if (!node || typeof node !== "object") {
            continue;
          }

          const item = node as Record<string, unknown>;
          const typeField = item["@type"];
          if (!ldJsonTypeMatches(typeField, "Event") && !ldJsonTypeMatches(typeField, "MusicEvent")) {
            continue;
          }

          const name = String(item.name ?? "").trim();
          if (!name || name.length < 2) {
            continue;
          }

          const startRaw = item.startDate;
          const startStr = typeof startRaw === "string" ? startRaw : null;
          if (!startStr) {
            continue;
          }

          const startsAt = new Date(startStr);
          if (Number.isNaN(startsAt.getTime())) {
            continue;
          }

          let endsAt: Date;
          const endRaw = item.endDate;
          if (typeof endRaw === "string") {
            const parsedEnd = new Date(endRaw);
            endsAt = Number.isNaN(parsedEnd.getTime())
              ? new Date(startsAt.getTime() + 4 * 60 * 60 * 1000)
              : parsedEnd;
          } else {
            endsAt = new Date(startsAt.getTime() + 4 * 60 * 60 * 1000);
          }

          if (endsAt.getTime() < nowMs) {
            continue;
          }

          const location = item.location;
          let locationName: string | null = null;
          let addressText = "";
          let lat: number | null = null;
          let lng: number | null = null;

          if (location && typeof location === "object") {
            const loc = location as Record<string, unknown>;
            const locName = loc.name;
            if (typeof locName === "string" && locName.trim()) {
              locationName = locName.trim();
            }

            const address = loc.address;
            if (typeof address === "string") {
              addressText = address;
            } else if (address && typeof address === "object") {
              const addr = address as Record<string, unknown>;
              addressText = [addr.addressLocality, addr.streetAddress, addr.postalCode, addr.addressRegion]
                .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
                .join(" ");
            }

            const geo = loc.geo;
            if (geo && typeof geo === "object") {
              const g = geo as Record<string, unknown>;
              const la = Number(g.latitude);
              const ln = Number(g.longitude);
              if (Number.isFinite(la) && Number.isFinite(ln)) {
                lat = la;
                lng = ln;
              }
            }
          }

          const desc = typeof item.description === "string" ? item.description.slice(0, 500) : null;
          // Diginights.com is national — keep Tübingen-area rows only.
          if (!isTuebingenAreaEvent({ locationName, addressText, lat, lng, title: name, description: desc })) {
            continue;
          }

          const urlField = item.url;
          const externalLink = typeof urlField === "string" && urlField.startsWith("http") ? urlField : DIGINIGHTS_URL;
          const eventId = generateEventId("diginights", startsAt, name);
          if (seen.has(eventId)) {
            continue;
          }

          seen.add(eventId);
          events.push({
            id: eventId,
            source: "diginights",
            title: name,
            description: desc,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            max_guests: 0,
            contribution_cents: 0,
            public_lat: lat,
            public_lng: lng,
            is_external: true,
            external_link: externalLink,
            vibe_label: "Diginights",
            spots_left: 0,
            location_name: locationName ?? "Tübingen",
            event_scope: "nightlife",
            category_slug: "party",
            category_label: "Party",
          } as PartyCard);
        }
      }
    });

    if (events.length === 0) {
      console.warn(
        "[diginights] No Event/MusicEvent nodes in JSON-LD — page structure may have changed.",
      );
    }

    return events.slice(0, 80);
  } catch (error) {
    console.error("Error fetching Diginights source:", error);
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
          source: "tuebingen-market",
          title,
          description: "Offizieller Markttermin der Universitätsstadt Tübingen",
          starts_at: parsedRange.startsAt,
          ends_at: parsedRange.endsAt,
          max_guests: 0,
          contribution_cents: 0,
          public_lat: TUEBINGEN_VENUE_COORDS.marktplatz.lat,
          public_lng: TUEBINGEN_VENUE_COORDS.marktplatz.lng,
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
          source: "tuebingen-flohmarkt",
          title: "Städtischer Flohmarkt in der Uhlandstraße",
          description: "Offizieller Flohmarkttermin der Universitätsstadt Tübingen",
          starts_at: startsAt,
          ends_at: endsAt,
          max_guests: 0,
          contribution_cents: 0,
          public_lat: TUEBINGEN_VENUE_COORDS.uhlandstrasse.lat,
          public_lng: TUEBINGEN_VENUE_COORDS.uhlandstrasse.lng,
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

export async function fetchUniCalendarEvents(): Promise<PartyCard[]> {
  return fetchGenericCalendarEvents({
    source: "uni-tuebingen",
    url: UNI_EVENTS_URL,
    vibeLabel: "Uni Tübingen",
    locationName: "Universität Tübingen",
    categoryLabel: "Workshop",
    categorySlug: "workshop",
    scope: "daytime",
  });
}

export async function fetchSudhausEvents(): Promise<PartyCard[]> {
  return fetchGenericCalendarEvents({
    source: "sudhaus",
    url: SUDHAUS_URL,
    vibeLabel: "Sudhaus",
    locationName: "Sudhaus Tübingen",
    categoryLabel: "Kultur",
    categorySlug: "culture",
    scope: "daytime",
  });
}

export async function fetchClubVoltaireEvents(): Promise<PartyCard[]> {
  return fetchGenericCalendarEvents({
    source: "club-voltaire",
    url: CLUB_VOLTAIRE_URL,
    vibeLabel: "Club Voltaire",
    locationName: "Club Voltaire Tübingen",
    categoryLabel: "Party",
    categorySlug: "party",
    scope: "nightlife",
  });
}

export async function fetchDaiEvents(): Promise<PartyCard[]> {
  return fetchGenericCalendarEvents({
    source: "dai",
    url: DAI_URL,
    vibeLabel: "d.a.i.",
    locationName: "d.a.i. Tübingen",
    categoryLabel: "Kultur",
    categorySlug: "culture",
    scope: "daytime",
  });
}

export async function fetchPartykelEvents(): Promise<PartyCard[]> {
  try {
    const response = await fetch(PARTYKEL_URL, {
      cache: "no-store",
      headers: {
        "User-Agent": "wasgehttueb-events-bot/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) {
      console.warn("partykel fetch failed with status:", response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const events: PartyCard[] = [];
    const seen = new Set<string>();
    const nowMs = Date.now();

    $("a[href*='/events/view/id/']").each((_, node) => {
      const eventLink = $(node).attr("href") ?? "";
      const eventTitle = $(node).text().replace(/\s+/g, " ").trim();
      if (!eventTitle) return;

      const locationLink = $(node).closest("p,li,div,tr").find("a[href*='/locations/view/id/']").first();
      const locationName = locationLink.text().replace(/\s+/g, " ").trim() || "Tübingen";
      if (!/tuebingen|tübingen/i.test(locationName)) return;

      const dateMatch = eventLink.match(/\/date\/(\d{9,11})/);
      if (!dateMatch) return;
      const dayAnchorMs = Number(dateMatch[1]) * 1000;
      if (!Number.isFinite(dayAnchorMs)) return;

      const startsAt = new Date(dayAnchorMs);
      if (startsAt.getTime() < nowMs - 24 * 60 * 60 * 1000) return;

      const eventId = generateEventId("partykel", startsAt, eventTitle);
      if (seen.has(eventId)) return;
      seen.add(eventId);

      const absoluteLink = eventLink.startsWith("http")
        ? eventLink
        : `https://www.partykel.info${eventLink.startsWith("/") ? "" : "/"}${eventLink}`;

      events.push({
        id: eventId,
        source: "partykel",
        title: eventTitle.slice(0, 140),
        description: `Event-Hinweis via Partykel (${locationName})`,
        starts_at: startsAt.toISOString(),
        ends_at: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        max_guests: 0,
        contribution_cents: 0,
        public_lat: (resolveTuebingenVenueCoordsFromText(locationName)?.coords.lat ?? TUEBINGEN_VENUE_COORDS.tuebingenCenter.lat),
        public_lng: (resolveTuebingenVenueCoordsFromText(locationName)?.coords.lng ?? TUEBINGEN_VENUE_COORDS.tuebingenCenter.lng),
        is_external: true,
        external_link: absoluteLink,
        vibe_label: "Partykel",
        spots_left: 0,
        location_name: locationName,
        category_slug: "culture",
        category_label: "Kultur",
        event_scope: "mixed",
        is_all_day: false,
        audience_label: "Alle",
        price_info: null,
      } as PartyCard);
    });

    return events.slice(0, 40);
  } catch (error) {
    console.error("Error fetching Partykel events:", error);
    return [];
  }
}

export async function fetchRedditEvents(): Promise<PartyCard[]> {
  const now = Date.now();
  const maxPostAgeMs = 30 * 24 * 60 * 60 * 1000;
  const events: PartyCard[] = [];
  const seenIds = new Set<string>();

  for (const subreddit of REDDIT_SUBREDDITS) {
    const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=60`;
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "User-Agent": "wasgehttueb-events-bot/1.0",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.warn(`reddit ${subreddit} fetch failed with status:`, response.status);
        continue;
      }

      const payload = await response.json() as {
        data?: { children?: Array<{ data?: Record<string, unknown> }> };
      };
      const children = payload.data?.children ?? [];

      for (const child of children) {
        const post = child.data ?? {};
        const title = String(post.title ?? "").trim();
        const selftext = String(post.selftext ?? "").trim();
        const permalink = String(post.permalink ?? "").trim();
        const createdUtc = Number(post.created_utc ?? 0);
        const isSelf = Boolean(post.is_self ?? false);
        const over18 = Boolean(post.over_18 ?? false);
        const removed = String(post.removed_by_category ?? "").trim().length > 0;

        if (!isSelf || over18 || removed || !title || !createdUtc) {
          continue;
        }

        const postedAtMs = createdUtc * 1000;
        if (!Number.isFinite(postedAtMs) || now - postedAtMs > maxPostAgeMs) {
          continue;
        }

        const haystack = `${title}\n${selftext}`.slice(0, 2000);
        if (!isLikelyRedditEvent(haystack)) {
          continue;
        }

        const startsAtDate = parseRedditEventDate(haystack, createdUtc);
        if (!startsAtDate || startsAtDate.getTime() < now - 24 * 60 * 60 * 1000) {
          continue;
        }

        const eventId = generateEventId(`reddit-${subreddit}`, startsAtDate, title);
        if (seenIds.has(eventId)) {
          continue;
        }
        seenIds.add(eventId);

        events.push({
          id: eventId,
          source: `reddit-${subreddit}`,
          title: title.slice(0, 140),
          description: selftext.slice(0, 320) || `Event-Hinweis aus r/${subreddit}`,
          starts_at: startsAtDate.toISOString(),
          ends_at: new Date(startsAtDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          max_guests: 0,
          contribution_cents: 0,
          public_lat: null,
          public_lng: null,
          is_external: true,
          external_link: permalink ? `https://www.reddit.com${permalink}` : `https://www.reddit.com/r/${subreddit}/new/`,
          vibe_label: `Reddit r/${subreddit}`,
          spots_left: 0,
          location_name: "Tübingen",
          category_slug: "community",
          category_label: "Community",
          event_scope: "daytime",
          is_all_day: false,
          audience_label: "Alle",
          price_info: null,
        } as PartyCard);
      }
    } catch (error) {
      console.error(`Error fetching reddit events from r/${subreddit}:`, error);
    }
  }

  return events.slice(0, 30);
}
