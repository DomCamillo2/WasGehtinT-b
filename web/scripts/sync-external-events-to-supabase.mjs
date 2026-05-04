import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

/** Fallback if a scraped event omits `source` */
const DEFAULT_SOURCE = "official-scraper";
const DEFAULT_DIGINIGHTS_URLS = [
  "https://diginights.com/city/tuebingen",
  "https://diginights.com/city/tubingen",
  "https://diginights.com",
];
const SCHLACHTHAUS_URL = "https://www.schlachthaus-tuebingen.de/";
const KUCKUCK_PROGRAM_URL = "https://kuckuck-bar.de/wochenprogramm/";
const FSRVV_CLUBHAUS_URL = "https://www.fsrvv.de/2026/03/06/clubhausfesttermine-sose-2026/";
const EPPLEHAUS_ICAL_URL = "https://www.epplehaus.de/events/?ical=1";
const TUEBINGEN_MARKETS_URL = "https://www.tuebingen.de/3393.html";
const TUEBINGEN_FLEA_MARKETS_URL = "https://www.tuebingen.de/3392.html";

const KUCKUCK_COORDS = { lat: 48.5413588, lng: 9.0599431 };
const CLUBHAUS_COORDS = { lat: 48.5243852, lng: 9.0605991 };
const VENUE_COORDINATES = {
  schlachthaus: { lat: 48.5255, lng: 9.0515 },
  "blauer turm": { lat: 48.5178, lng: 9.0601 },
  top10: { lat: 48.5145, lng: 9.0835 },
  sudhaus: { lat: 48.5065, lng: 9.0625 },
};

const CANCELLED_EVENT_PATTERNS = [
  /\bausfall\b/i,
  /\babgesagt\b/i,
  /\bcancelled\b/i,
  /\bcanceled\b/i,
  /\bcancel\b/i,
  /\bfällt\s+aus\b/i,
];

const MUSIC_GENRE_PATTERNS = [
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

function inferMusicGenre(text) {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
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

function slugify(input) {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** YYYY-MM-DD + wall time in Europe/Berlin → UTC Date */
function berlinWallTimeToUtc(isoDate, hour, minute) {
  const [y, mon, d] = isoDate.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mon) || !Number.isFinite(d)) {
    return new Date(NaN);
  }

  let t = Date.UTC(y, mon - 1, d, hour - 1, minute, 0);

  for (let i = 0; i < 24; i += 1) {
    const dt = new Date(t);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(dt);

    const py = Number(parts.find((p) => p.type === "year")?.value);
    const pm = Number(parts.find((p) => p.type === "month")?.value);
    const pd = Number(parts.find((p) => p.type === "day")?.value);
    const ph = Number(parts.find((p) => p.type === "hour")?.value);
    const pmin = Number(parts.find((p) => p.type === "minute")?.value);

    if (py === y && pm === mon && pd === d && ph === hour && pmin === minute) {
      return dt;
    }

    const diffMin = hour * 60 + minute - (ph * 60 + pmin);
    t += diffMin * 60 * 1000;
  }

  return new Date(t);
}

function normalizeChunk(input) {
  return String(input ?? "")
    .replace(/\s+/g, " ")
    .replace(/([a-zäöüß])([A-ZÄÖÜ])/g, "$1 $2")
    .trim();
}

function decodeIcsText(value) {
  return String(value ?? "")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function normalizeGermanWord(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseGermanMonthName(name) {
  const normalized = normalizeGermanWord(name);
  const months = {
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

function buildBerlinIsoDate(year, month, day, hour = 9, minute = 0) {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const min = String(minute).padStart(2, "0");
  const date = new Date(`${year}-${mm}-${dd}T${hh}:${min}:00+02:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractDateRangeFromLabel(label) {
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

function sanitizeMarketTitle(raw) {
  return String(raw ?? "")
    .replace(/^\d{1,2}\.\s*(?:und|bis)\s*\d{1,2}\.\s*[A-Za-zÄÖÜäöüß]+\s*\d{4}:\s*/i, "")
    .replace(/^\d{1,2}\.\s*[A-Za-zÄÖÜäöüß]+\s*\d{4}:\s*/i, "")
    .trim();
}

function unfoldIcsLines(ics) {
  return String(ics ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

function parseIcsDate(value) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}+02:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toIsoDate(day, month) {
  if (!Number.isInteger(day) || !Number.isInteger(month)) {
    return null;
  }

  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  const now = Date.now();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());

  let year = Number(parts.find((p) => p.type === "year")?.value);
  if (!Number.isFinite(year)) {
    year = new Date().getUTCFullYear();
  }

  const pad = (n) => String(n).padStart(2, "0");
  let isoDate = `${year}-${pad(month)}-${pad(day)}`;
  let candidate = berlinWallTimeToUtc(isoDate, 20, 0);
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }

  if (candidate.getTime() < now - 12 * 60 * 60 * 1000) {
    isoDate = `${year + 1}-${pad(month)}-${pad(day)}`;
    candidate = berlinWallTimeToUtc(isoDate, 20, 0);
  }

  if (Number.isNaN(candidate.getTime()) || candidate.getTime() < now - 12 * 60 * 60 * 1000) {
    return null;
  }

  return candidate.toISOString();
}

async function fetchWithTimeout(url, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "WasGehtTueb-ExternalEventsWorker/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

function isCancelledEvent(event) {
  const content = [event.title, event.description, event.vibe_label, event.external_link]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  if (!content) {
    return false;
  }

  return CANCELLED_EVENT_PATTERNS.some((pattern) => pattern.test(content));
}

function parseWeeklyProgram(rawText) {
  const text = normalizeChunk(rawText);
  const tokenRegex = /(MO|DI|MI|DO|FR|SA|SO)\s*(\d{1,2})\.(\d{1,2})/g;
  const matches = Array.from(text.matchAll(tokenRegex));

  if (!matches.length) {
    return [];
  }

  const events = [];

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

    const normalizedBody = normalizeChunk(body);
    const firstSentence = normalizedBody.split(/[.!?]/)[0]?.trim() ?? normalizedBody;
    const titleBase = firstSentence.includes(" - ")
      ? firstSentence.split(" - ")[0]?.trim() || firstSentence
      : firstSentence;
    const title = titleBase.split(" ").filter(Boolean).slice(0, 8).join(" ").trim() || "Kuckuck Event";

    events.push({
      source: "kuckuck",
      id: `kuckuck-${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${slugify(title)}`,
      title,
      description: normalizedBody.slice(0, 240) || "Kuckuck Event in Tübingen",
      starts_at: startsAt,
      ends_at: new Date(new Date(startsAt).getTime() + 4 * 60 * 60 * 1000).toISOString(),
      public_lat: KUCKUCK_COORDS.lat,
      public_lng: KUCKUCK_COORDS.lng,
      external_link: KUCKUCK_PROGRAM_URL,
      vibe_label: "Kuckuck",
      location_name: "Kuckuck",
      music_genre: inferMusicGenre(body),
    });
  }

  return events.slice(0, 14);
}

function parseClubhausDate(day, month, year) {
  const pad = (n) => String(n).padStart(2, "0");
  const candidate = berlinWallTimeToUtc(`${year}-${pad(month)}-${pad(day)}`, 20, 0);
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }
  return candidate.toISOString();
}

function normalizeFsrvvTitle(raw) {
  const clean = String(raw ?? "").replace(/\s+/g, " ").replace(/\s*\|\s*/g, " ").trim();
  if (!clean) {
    return "Clubhausfest";
  }

  if (clean.toLowerCase().includes("ausfall")) {
    return clean;
  }

  return `Clubhausfest: ${clean}`;
}

async function fetchKuckuckEvents() {
  try {
    const html = await fetchWithTimeout(KUCKUCK_PROGRAM_URL);
    const $ = cheerio.load(html);
    const text = $("body").text();
    return parseWeeklyProgram(text);
  } catch (error) {
    console.error("[worker] Kuckuck scrape failed:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

async function fetchFsrvvClubhausEvents() {
  try {
    const html = await fetchWithTimeout(FSRVV_CLUBHAUS_URL);
    const $ = cheerio.load(html);
    const tableRows = $("article table tr");
    const parsedEvents = [];

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
          source: "clubhaus",
          id: `clubhaus-${dateKey}-${slugify(event.title)}`,
          title: event.title,
          description: "Offizieller Clubhausfesttermin (FSRVV), Wilhelmstraße 30, 72074 Tübingen",
          starts_at: startsAt,
          ends_at: new Date(new Date(startsAt).getTime() + 4 * 60 * 60 * 1000).toISOString(),
          public_lat: CLUBHAUS_COORDS.lat,
          public_lng: CLUBHAUS_COORDS.lng,
          external_link: FSRVV_CLUBHAUS_URL,
          vibe_label: "Clubhausfest",
          location_name: "Clubhaus",
          music_genre: inferMusicGenre(event.title),
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("[worker] Clubhaus scrape failed:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

async function fetchEpplehausEvents() {
  try {
    const ics = await fetchWithTimeout(EPPLEHAUS_ICAL_URL);
    const lines = unfoldIcsLines(ics);
    const parsedEvents = [];
    let currentEvent = null;

    for (const line of lines) {
      if (line === "BEGIN:VEVENT") {
        currentEvent = {};
        continue;
      }

      if (line === "END:VEVENT") {
        if (currentEvent) {
          parsedEvents.push(currentEvent);
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

      const rawKey = line.slice(0, separatorIndex);
      const rawValue = line.slice(separatorIndex + 1);
      const key = rawKey.split(";")[0];
      currentEvent[key] = rawValue;
    }

    return parsedEvents
      .map((event) => {
        const title = decodeIcsText(event.SUMMARY);
        const description = decodeIcsText(event.DESCRIPTION);
        const startsAt = parseIcsDate(event.DTSTART);
        const endsAt = parseIcsDate(event.DTEND) ?? (startsAt
          ? new Date(new Date(startsAt).getTime() + 4 * 60 * 60 * 1000).toISOString()
          : null);
        const externalLink = event.URL?.trim() || EPPLEHAUS_ICAL_URL;
        const uid = String(event.UID ?? "").trim();

        if (!title || !startsAt || !endsAt || !uid) {
          return null;
        }

        return {
          source: "epplehaus",
          id: `epplehaus-${slugify(uid.replace(/@.*/, ""))}`,
          title,
          description: description || "Event im Epplehaus, Karlstraße 13, 72072 Tübingen",
          starts_at: startsAt,
          ends_at: endsAt,
          public_lat: null,
          public_lng: null,
          external_link: externalLink,
          vibe_label: "Epplehaus",
          location_name: "Epplehaus",
          music_genre: inferMusicGenre(`${title} ${description}`),
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("[worker] Epplehaus scrape failed:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

async function fetchTuebingenMarketEvents() {
  try {
    const html = await fetchWithTimeout(TUEBINGEN_MARKETS_URL);
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
          source: "tuebingen-market",
          id: `tuebingen-market-${slugify(rawLabel)}`,
          title,
          description: "Offizieller Markttermin der Universitätsstadt Tübingen",
          starts_at: parsedRange.startsAt,
          ends_at: parsedRange.endsAt,
          public_lat: null,
          public_lng: null,
          external_link: externalLink,
          vibe_label: "Markt",
          location_name: title.toLowerCase().includes("rathaus") ? "Rathaus, Tübingen" : "Tübingen",
          music_genre: null,
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("[worker] Tuebingen market scrape failed:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

async function fetchTuebingenFleaMarketEvents() {
  try {
    const html = await fetchWithTimeout(TUEBINGEN_FLEA_MARKETS_URL);
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
          source: "tuebingen-flohmarkt",
          id: `tuebingen-flohmarkt-${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          title: "Städtischer Flohmarkt in der Uhlandstraße",
          description: "Offizieller Flohmarkttermin der Universitätsstadt Tübingen",
          starts_at: startsAt,
          ends_at: endsAt,
          public_lat: null,
          public_lng: null,
          external_link: TUEBINGEN_FLEA_MARKETS_URL,
          vibe_label: "Flohmarkt",
          location_name: "Uhlandstraße, Tübingen",
          music_genre: null,
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("[worker] Tuebingen flea market scrape failed:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

function generateEventId(venue, date, title) {
  const dateKey = date.toISOString().split("T")[0];
  return `${venue.toLowerCase()}-${dateKey}-${slugify(title)}`;
}

function getConfiguredDiginightsUrls() {
  const configured = process.env.DIGINIGHTS_URLS || process.env.DIGINIGHTS_URL || "";
  const rawUrls = configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const merged = [...rawUrls, ...DEFAULT_DIGINIGHTS_URLS];
  const unique = [];

  for (const url of merged) {
    if (!unique.includes(url)) {
      unique.push(url);
    }
  }

  return unique;
}

const SCHLACHTHAUS_LINE_PATTERN =
  /^(MO|DI|MI|DO|FR|SA|SO)\s+(\d{1,2})\.(\d{1,2})\.\s*(?:\|\s*)?(.+?)(?:\s*\|\s*(\d{1,2})[.:](\d{2}))?$/i;

async function fetchSchlachthausEvents() {
  try {
    const html = await fetchWithTimeout(SCHLACHTHAUS_URL);
    const $ = cheerio.load(html);
    const headingLines = $("h2, h3, h4, h5, h6")
      .toArray()
      .map((node) => $(node).text().replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim())
      .filter((line) => line.length > 0);

    const lines =
      headingLines.length > 0
        ? headingLines
        : $("body")
            .text()
            .split("\n")
            .map((line) => line.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim())
            .filter((line) => line.length > 0);

    const events = [];
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const uniqueEventIds = new Set();

    for (const rawLine of lines) {
      if (events.length >= 10) {
        break;
      }

      const line = rawLine.replace(/^#{1,6}\s+/gm, "").trim();
      const match = line.match(SCHLACHTHAUS_LINE_PATTERN);
      if (!match) {
        continue;
      }

      const day = Number(match[2]);
      const month = Number(match[3]);
      const rawTitle = String(match[4] ?? "").replace(/\s*\|\s*$/, "").trim();
      const title = rawTitle.replace(/\s+/g, " ").trim();
      const hour = Number(match[5] ?? "20");
      const minute = Number(match[6] ?? "00");

      if (!title || /geschlossen/i.test(title)) {
        continue;
      }

      if (!Number.isInteger(day) || !Number.isInteger(month) || day < 1 || day > 31 || month < 1 || month > 12) {
        continue;
      }

      if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        continue;
      }

      const pad = (n) => String(n).padStart(2, "0");
      let isoDate = `${currentYear}-${pad(month)}-${pad(day)}`;
      let eventDate = berlinWallTimeToUtc(isoDate, hour, minute);
      if (Number.isNaN(eventDate.getTime())) {
        continue;
      }

      if (eventDate < tenDaysAgo) {
        isoDate = `${currentYear + 1}-${pad(month)}-${pad(day)}`;
        eventDate = berlinWallTimeToUtc(isoDate, hour, minute);
      }

      if (Number.isNaN(eventDate.getTime()) || eventDate < tenDaysAgo) {
        continue;
      }

      const eventId = generateEventId("schlachthaus", eventDate, title);
      if (uniqueEventIds.has(eventId)) {
        continue;
      }

      uniqueEventIds.add(eventId);

      events.push({
        source: "schlachthaus",
        id: eventId,
        title,
        description: "Schlachthaus Tübingen – Kulturzentrum und Veranstaltungsort",
        starts_at: eventDate.toISOString(),
        ends_at: new Date(eventDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        public_lat: VENUE_COORDINATES.schlachthaus.lat,
        public_lng: VENUE_COORDINATES.schlachthaus.lng,
        external_link: SCHLACHTHAUS_URL,
        vibe_label: "Schlachthaus",
        location_name: "Schlachthaus",
        music_genre: inferMusicGenre(title),
      });
    }

    return events;
  } catch (error) {
    console.error("[worker] Schlachthaus scrape failed:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

function ldJsonTypeMatches(types, needle) {
  if (types === needle) {
    return true;
  }

  if (Array.isArray(types)) {
    return types.some((t) => t === needle);
  }

  return false;
}

function collectLdJsonEventNodes(root) {
  if (!root || typeof root !== "object") {
    return [];
  }

  const graph = root["@graph"];
  if (Array.isArray(graph)) {
    return graph;
  }

  if (ldJsonTypeMatches(root["@type"], "ItemList") && Array.isArray(root.itemListElement)) {
    const nested = [];
    for (const el of root.itemListElement) {
      if (!el || typeof el !== "object") {
        continue;
      }

      nested.push(el.item ?? el);
    }

    return nested;
  }

  return [root];
}

async function fetchDiginightsEvents() {
  const diginightsUrls = getConfiguredDiginightsUrls();
  const aggregatedEvents = [];
  const nowMs = Date.now();
  const seen = new Set();

  for (const diginightsUrl of diginightsUrls) {
    try {
      const html = await fetchWithTimeout(diginightsUrl);
      const $ = cheerio.load(html);

      $('script[type="application/ld+json"]').each((_, el) => {
        const raw = $(el).html();
        if (!raw) {
          return;
        }

        let data;
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

            if (!ldJsonTypeMatches(node["@type"], "Event") && !ldJsonTypeMatches(node["@type"], "MusicEvent")) {
              continue;
            }

            const name = String(node.name ?? "").trim();
            if (!name || name.length < 2) {
              continue;
            }

            const startStr = typeof node.startDate === "string" ? node.startDate : null;
            if (!startStr) {
              continue;
            }

            const startsAt = new Date(startStr);
            if (Number.isNaN(startsAt.getTime())) {
              continue;
            }

            let endsAt;
            if (typeof node.endDate === "string") {
              const parsedEnd = new Date(node.endDate);
              endsAt = Number.isNaN(parsedEnd.getTime())
                ? new Date(startsAt.getTime() + 4 * 60 * 60 * 1000)
                : parsedEnd;
            } else {
              endsAt = new Date(startsAt.getTime() + 4 * 60 * 60 * 1000);
            }

            if (endsAt.getTime() < nowMs) {
              continue;
            }

            let locationName = "Tübingen";
            let lat = null;
            let lng = null;
            const loc = node.location;
            if (loc && typeof loc === "object") {
              if (typeof loc.name === "string" && loc.name.trim()) {
                locationName = loc.name.trim();
              }

              const geo = loc.geo;
              if (geo && typeof geo === "object") {
                const la = Number(geo.latitude);
                const ln = Number(geo.longitude);
                if (Number.isFinite(la) && Number.isFinite(ln)) {
                  lat = la;
                  lng = ln;
                }
              }
            }

            const urlField = node.url;
            const externalLink =
              typeof urlField === "string" && urlField.startsWith("http") ? urlField : diginightsUrl;
            const desc = typeof node.description === "string" ? node.description.slice(0, 500) : null;
            const eventId = generateEventId("diginights", startsAt, name);
            if (seen.has(eventId)) {
              continue;
            }

            seen.add(eventId);

            aggregatedEvents.push({
              source: "diginights",
              id: eventId,
              title: name,
              description: desc || "Diginights Event in Tübingen",
              starts_at: startsAt.toISOString(),
              ends_at: endsAt.toISOString(),
              public_lat: lat,
              public_lng: lng,
              external_link: externalLink,
              vibe_label: "Diginights",
              location_name: locationName,
              music_genre: inferMusicGenre(name),
            });
          }
        }
      });
    } catch (error) {
      console.warn(
        `[worker] Diginights source failed (${diginightsUrl}):`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  if (!aggregatedEvents.length) {
    console.warn("[worker] Diginights JSON-LD: 0 events (structure may differ per URL).");
    return [];
  }

  return aggregatedEvents.slice(0, 80);
}

function toDbRow(event) {
  return {
    id: event.id,
    source: event.source ?? DEFAULT_SOURCE,
    title: event.title,
    description: event.description || null,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    public_lat: event.public_lat ?? null,
    public_lng: event.public_lng ?? null,
    external_link: event.external_link ?? null,
    vibe_label: event.vibe_label,
    location_name: event.location_name ?? null,
    music_genre: event.music_genre ?? null,
    scraped_at: new Date().toISOString(),
  };
}

function dedupeAndSort(events) {
  const nowMs = Date.now();
  const unique = new Map();

  for (const event of events) {
    if (!event?.id) {
      continue;
    }

    if (isCancelledEvent(event)) {
      continue;
    }

    const endMs = new Date(event.ends_at).getTime();
    if (!Number.isFinite(endMs) || endMs < nowMs) {
      continue;
    }

    if (!unique.has(event.id)) {
      unique.set(event.id, event);
    }
  }

  return Array.from(unique.values()).sort(
    (left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime()
  );
}

async function syncToSupabase(events) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const adminKey = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !adminKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY");
  }

  if (adminKey.startsWith("eyJ")) {
    throw new Error(
      "Detected legacy Supabase JWT admin key. Legacy API keys are disabled. Set SUPABASE_SECRET_KEY (sb_secret_...) in GitHub Secrets and environment variables."
    );
  }

  const supabase = createClient(supabaseUrl, adminKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const runStartedAt = new Date().toISOString();
  const nowIso = new Date().toISOString();
  const rows = events.map((event) => ({
    ...toDbRow(event),
    scraped_at: runStartedAt,
  }));

  if (rows.length === 0) {
    console.warn(
      "[worker] No events to upsert — skipping per-source stale delete; pruning all expired rows only.",
    );
    const expiredEmpty = await supabase.from("external_events_cache").delete().lt("ends_at", nowIso);
    if (expiredEmpty.error) {
      throw new Error(`Cleanup (expired) failed: ${expiredEmpty.error.message}`);
    }
    return { upserted: 0 };
  }

  const { error: upsertError } = await supabase.from("external_events_cache").upsert(rows, { onConflict: "id" });

  if (upsertError) {
    throw new Error(`Upsert failed: ${upsertError.message}`);
  }

  const sourcesTouched = new Set(rows.map((row) => row.source ?? DEFAULT_SOURCE));
  for (const source of sourcesTouched) {
    const staleResult = await supabase
      .from("external_events_cache")
      .delete()
      .eq("source", source)
      .lt("scraped_at", runStartedAt);

    if (staleResult.error) {
      throw new Error(`Cleanup (stale) failed for ${source}: ${staleResult.error.message}`);
    }
  }

  const expiredResult = await supabase.from("external_events_cache").delete().lt("ends_at", nowIso);

  if (expiredResult.error) {
    throw new Error(`Cleanup (expired) failed: ${expiredResult.error.message}`);
  }

  return { upserted: rows.length };
}

async function main() {
  const startedAt = Date.now();
  console.log("[worker] Starting external events sync...");

  const [kuckuck, clubhaus, schlachthaus, diginights, epplehaus, markets, fleaMarkets] = await Promise.all([
    fetchKuckuckEvents(),
    fetchFsrvvClubhausEvents(),
    fetchSchlachthausEvents(),
    fetchDiginightsEvents(),
    fetchEpplehausEvents(),
    fetchTuebingenMarketEvents(),
    fetchTuebingenFleaMarketEvents(),
  ]);

  const merged = dedupeAndSort([
    ...kuckuck,
    ...clubhaus,
    ...schlachthaus,
    ...diginights,
    ...epplehaus,
    ...markets,
    ...fleaMarkets,
  ]);
  const result = await syncToSupabase(merged);

  console.log(
    `[worker] Done. events=${merged.length} upserted=${result.upserted} durationMs=${Date.now() - startedAt}`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[worker] Failed: ${message}`);
  process.exit(1);
});
