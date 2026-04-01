"use server";

import * as cheerio from "cheerio";
import { unstable_cache } from "next/cache";
import { PartyCard } from "@/lib/types";
import {
  fetchSchlachthausEvents,
  fetchDignightsEvents,
  fetchEpplehausEvents,
  fetchTuebingenFleaMarketEvents,
  fetchTuebingenMarketEvents,
} from "@/lib/scrapers/official-venues";

const KUCKUCK_PROGRAM_URL = "https://kuckuck-bar.de/wochenprogramm/";
const KUCKUCK_LAT = 48.5413588;
const KUCKUCK_LNG = 9.0599431;
const FSRVV_CLUBHAUS_URL = "https://www.fsrvv.de/2026/03/06/clubhausfesttermine-sose-2026/";
const CLUBHAUS_LAT = 48.5243852;
const CLUBHAUS_LNG = 9.0605991;

type ParsedEvent = {
  dateKey: string;
  startsAt: string;
  title: string;
  description: string;
  musicGenre: string | null;
};

const CANCELLED_EVENT_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /\bausfall\b/i, description: "ausfall" },
  { pattern: /\babgesagt\b/i, description: "abgesagt" },
  { pattern: /\bcancelled\b/i, description: "cancelled" },
  { pattern: /\bcanceled\b/i, description: "canceled" },
  { pattern: /\bcancel\b/i, description: "cancel" },
  { pattern: /\bfällt\s+aus\b/i, description: "fällt aus" },
];

function validateCancellationPatterns(): void {
  for (const { pattern, description } of CANCELLED_EVENT_PATTERNS) {
    try {
      // Force a no-op test at startup to catch malformed regex edits early.
      void pattern.test(description);
    } catch (error) {
      console.error("[external-events] Invalid cancellation regex pattern:", description, error);
    }
  }
}

validateCancellationPatterns();

function isCancelledOrOutageEvent(event: PartyCard): boolean {
  const content = [event.title, event.description, event.vibe_label, event.external_link]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  if (!content) {
    return false;
  }

  return CANCELLED_EVENT_PATTERNS.some(({ pattern }) => pattern.test(content));
}

function toIsoDate(day: number, month: number): string | null {
  if (!Number.isInteger(day) || !Number.isInteger(month)) {
    return null;
  }

  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  let year = currentYear;
  if (month < currentMonth) {
    year += 1;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day, 20, 0, 0));
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }

  // Reject date overflows like 31.2. that Date auto-normalizes.
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  // Never return past dates.
  if (candidate.getTime() < now.getTime()) {
    return null;
  }

  return candidate.toISOString();
}

function normalizeChunk(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .replace(/([a-zäöüß])([A-ZÄÖÜ])/g, "$1 $2")
    .trim();
}

function toTitle(raw: string): string {
  const normalized = normalizeChunk(raw);
  if (!normalized) {
    return "Kuckuck Event";
  }

  const firstSentence = normalized.split(/[.!?]/)[0]?.trim() ?? normalized;
  const titleBase = firstSentence.includes(" - ")
    ? firstSentence.split(" - ")[0]?.trim() || firstSentence
    : firstSentence;

  const words = titleBase.split(" ").filter(Boolean);
  return words.slice(0, 8).join(" ").trim() || "Kuckuck Event";
}

const MUSIC_GENRE_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /techno|acid\s*techno/i, label: "Techno" },
  { regex: /house|deep\s*house|afro\s*house/i, label: "House" },
  { regex: /drum\s*&?\s*bass|dnb/i, label: "Drum & Bass" },
  { regex: /hip\s*hop|rap|trap/i, label: "Hip-Hop" },
  { regex: /reggaeton|latin/i, label: "Reggaeton" },
  { regex: /rnb|r\s*&\s*b/i, label: "R&B" },
  { regex: /electro|edm/i, label: "Electro" },
  { regex: /disco|funk/i, label: "Disco/Funk" },
  { regex: /rock|indie|metal|punk/i, label: "Rock/Indie" },
  { regex: /karaoke/i, label: "Karaoke" },
  { regex: /90s|2000s|80s/i, label: "Classics" },
  { regex: /mixed\s*music|all\s*styles|querbeet/i, label: "Mixed" },
];

function inferMusicGenre(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  for (const pattern of MUSIC_GENRE_PATTERNS) {
    if (pattern.regex.test(normalized)) {
      return pattern.label;
    }
  }

  return null;
}

function parseWeeklyProgram(rawText: string): ParsedEvent[] {
  const text = normalizeChunk(rawText);
  const tokenRegex = /(MO|DI|MI|DO|FR|SA|SO)\s*(\d{1,2})\.(\d{1,2})/g;
  const matches = Array.from(text.matchAll(tokenRegex));

  if (!matches.length) {
    return [];
  }

  const events: ParsedEvent[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];

    const matchIndex = match.index ?? 0;
    const currentToken = match[0] ?? "";
    const chunkStart = matchIndex + currentToken.length;
    const chunkEnd = next?.index ?? text.length;
    const body = text.slice(chunkStart, chunkEnd).trim();

    const day = Number(match[2]);
    const month = Number(match[3]);
    const startsAt = toIsoDate(day, month);

    if (!startsAt) {
      continue;
    }

    const dateKey = `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}`;
    events.push({
      dateKey,
      startsAt,
      title: toTitle(body),
      description: normalizeChunk(body).slice(0, 240),
      musicGenre: inferMusicGenre(body),
    });
  }

  return events;
}

async function fetchKuckuckEventsAction(): Promise<PartyCard[]> {
  try {
    const response = await fetch(KUCKUCK_PROGRAM_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const text = $("body").text();
    const parsed = parseWeeklyProgram(text);

    return parsed.slice(0, 14).map((event) => ({
      id: `kuckuck-${event.dateKey.replace(".", "-")}-${event.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}`,
      title: event.title,
      description: event.description || "Kuckuck Event in Tübingen",
      starts_at: event.startsAt,
      ends_at: new Date(new Date(event.startsAt).getTime() + 4 * 60 * 60 * 1000).toISOString(),
      max_guests: 0,
      contribution_cents: 0,
      public_lat: KUCKUCK_LAT,
      public_lng: KUCKUCK_LNG,
      is_external: true,
      external_link: null,
      vibe_label: "Kuckuck",
      spots_left: 0,
      location_name: "Kuckuck",
      music_genre: event.musicGenre,
    }));
  } catch {
    return [];
  }
}

function parseClubhausDate(day: number, month: number, year: number): string | null {
  const candidate = new Date(Date.UTC(year, month - 1, day, 20, 0, 0));
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }
  return candidate.toISOString();
}

function normalizeFsrvvTitle(raw: string): string {
  const clean = raw.replace(/\s+/g, " ").replace(/\s*\|\s*/g, " ").trim();
  if (!clean) {
    return "Clubhausfest";
  }

  if (clean.toLowerCase().includes("ausfall")) {
    return clean;
  }

  return `Clubhausfest: ${clean}`;
}

async function fetchFsrvvClubhausEventsAction(): Promise<PartyCard[]> {
  try {
    const response = await fetch(FSRVV_CLUBHAUS_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const tableRows = $("article table tr");
    const parsedEvents: Array<{
      day: number;
      month: number;
      year: number;
      title: string;
    }> = [];

    tableRows.each((_, row) => {
      const cells = $(row)
        .find("td")
        .map((__, cell) => $(cell).text().trim())
        .get();

      if (cells.length < 2) {
        return;
      }

      const dateText = cells[0] ?? "";
      const titleText = cells[1] ?? "";
      const match = dateText.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

      if (!match) {
        return;
      }

      parsedEvents.push({
        day: Number(match[1]),
        month: Number(match[2]),
        year: Number(match[3]),
        title: normalizeFsrvvTitle(titleText),
      });
    });

    if (!parsedEvents.length) {
      const fallbackText = $("article").text();
      const regex = /(\d{2})\.(\d{2})\.(\d{4})\s*\|\s*([^\n]+)/g;
      for (const match of fallbackText.matchAll(regex)) {
        parsedEvents.push({
          day: Number(match[1]),
          month: Number(match[2]),
          year: Number(match[3]),
          title: normalizeFsrvvTitle((match[4] ?? "").trim()),
        });
      }
    }

    return parsedEvents
      .map((event) => {
        const startsAt = parseClubhausDate(event.day, event.month, event.year);
        if (!startsAt) {
          return null;
        }

        const dateKey = `${String(event.day).padStart(2, "0")}-${String(event.month).padStart(2, "0")}-${event.year}`;

        return {
          id: `clubhaus-${dateKey}-${event.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")}`,
          title: event.title,
          description: "Offizieller Clubhausfesttermin (FSRVV), Wilhelmstraße 30, 72074 Tübingen",
          starts_at: startsAt,
          ends_at: new Date(new Date(startsAt).getTime() + 4 * 60 * 60 * 1000).toISOString(),
          max_guests: 0,
          contribution_cents: 0,
          public_lat: CLUBHAUS_LAT,
          public_lng: CLUBHAUS_LNG,
          is_external: true,
          external_link: null,
          vibe_label: "Clubhausfest",
          spots_left: 0,
          location_name: "Clubhaus",
          music_genre: inferMusicGenre(event.title),
        } as PartyCard;
      })
      .filter((event): event is PartyCard => Boolean(event));
  } catch {
    return [];
  }
}

const getCachedExternalEvents = unstable_cache(
  async (): Promise<PartyCard[]> => {
    const nowMs = Date.now();
    const [
      kuckuckEvents,
      clubhausEvents,
      schlachthausEvents,
      dignightsEvents,
      epplehausEvents,
      tuebingenMarketEvents,
      tuebingenFleaMarketEvents,
    ] = await Promise.all([
      fetchKuckuckEventsAction(),
      fetchFsrvvClubhausEventsAction(),
      fetchSchlachthausEvents(),
      fetchDignightsEvents(),
      fetchEpplehausEvents(),
      fetchTuebingenMarketEvents(),
      fetchTuebingenFleaMarketEvents(),
    ]);

    const allEvents = [
      ...kuckuckEvents,
      ...clubhausEvents,
      ...schlachthausEvents,
      ...dignightsEvents,
      ...epplehausEvents,
      ...tuebingenMarketEvents,
      ...tuebingenFleaMarketEvents,
    ]
      .filter((event) => !isCancelledOrOutageEvent(event))
      .filter((event) => {
        const endMs = new Date(event.ends_at).getTime();
        return Number.isFinite(endMs) && endMs >= nowMs;
      });
    
    // Remove duplicates by ID
    const uniqueMap = new Map<string, PartyCard>();
    for (const event of allEvents) {
      if (!uniqueMap.has(event.id)) {
        uniqueMap.set(event.id, event);
      }
    }

    return Array.from(uniqueMap.values()).sort(
      (left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
    );
  },
  ["external-events-v4"],
  { revalidate: 60 * 5, tags: ["external-events"] },
);

export async function fetchExternalEventsAction(): Promise<PartyCard[]> {
  return getCachedExternalEvents();
}
