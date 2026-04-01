import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

const SOURCE = "official-scraper";
const DEFAULT_DIGINIGHTS_URLS = [
  "https://diginights.com/city/tuebingen",
  "https://diginights.com/city/tubingen",
  "https://diginights.com",
];
const SCHLACHTHAUS_URL = "https://www.schlachthaus-tuebingen.de/";
const KUCKUCK_PROGRAM_URL = "https://kuckuck-bar.de/wochenprogramm/";
const FSRVV_CLUBHAUS_URL = "https://www.fsrvv.de/2026/03/06/clubhausfesttermine-sose-2026/";
const EPPLEHAUS_ICAL_URL = "https://www.epplehaus.de/events/?ical=1";

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

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  if (candidate.getTime() < now.getTime()) {
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
  const candidate = new Date(Date.UTC(year, month - 1, day, 20, 0, 0));
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

function parseGermanDate(dateStr) {
  const value = String(dateStr ?? "").trim();

  const dotMatch = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    const date = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), 20, 0, 0));
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const monthNames = {
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

  const textMatch = value.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (textMatch) {
    const [, day, monthName, year] = textMatch;
    const month = monthNames[monthName.toLowerCase()];
    if (month) {
      const date = new Date(Date.UTC(parseInt(year, 10), month - 1, parseInt(day, 10), 20, 0, 0));
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

function getVenueCoordinates(venueName) {
  const normalized = String(venueName ?? "").toLowerCase().trim();
  for (const [key, coords] of Object.entries(VENUE_COORDINATES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }
  return null;
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

async function fetchSchlachthausEvents() {
  try {
    const html = await fetchWithTimeout(SCHLACHTHAUS_URL);
    const $ = cheerio.load(html);
    const bodyText = $("body").text();
    const lines = bodyText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const eventPattern = /^(MO|DI|MI|DO|FR|SA|SO)\s+(\d{1,2})\.(\d{1,2})\.\s*\|\s*(.+?)\s*\|\s*(\d{1,2}):(\d{2})/i;
    const events = [];
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    for (const line of lines) {
      if (events.length >= 10) {
        break;
      }

      const match = line.match(eventPattern);
      if (!match) {
        continue;
      }

      const [, , dayStr, monthStr, title, hourStr, minStr] = match;
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const hour = parseInt(hourStr, 10);
      const min = parseInt(minStr, 10);

      let eventDate = new Date(Date.UTC(currentYear, month - 1, day, hour, min, 0));
      if (eventDate < tenDaysAgo) {
        const nextYearDate = new Date(Date.UTC(currentYear + 1, month - 1, day, hour, min, 0));
        if (nextYearDate > tenDaysAgo) {
          eventDate = nextYearDate;
        } else {
          continue;
        }
      }

      events.push({
        id: generateEventId("schlachthaus", eventDate, title),
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

async function fetchDiginightsEvents() {
  const diginightsUrls = getConfiguredDiginightsUrls();
  const aggregatedEvents = [];

  for (const diginightsUrl of diginightsUrls) {
    try {
      const html = await fetchWithTimeout(diginightsUrl);
      const $ = cheerio.load(html);

      const eventElements = $(
        'article, [class*="event"], [class*="concert"], [class*="party"], .event-card, [class*="event-item"]'
      )
        .slice(0, 20)
        .toArray();

      for (const element of eventElements) {
        const $elem = $(element);
        const titleElem = $elem.find('h2, h3, h4, .title, [class*="title"]').first();
        const dateElem = $elem.find('time, [class*="date"], [class*="time"], .datum').first();
        const venueElem = $elem.find('[class*="venue"], [class*="location"], [class*="ort"]').first();
        const anchorElem = $elem.find("a[href]").first();

        let title = titleElem.text().trim();
        const dateText = dateElem.attr("datetime") || dateElem.text().trim();
        const venueName = venueElem.text().trim() || "Diginights Tübingen";
        const contextText = normalizeChunk($elem.text()).toLowerCase();

        if (!title && !dateText) {
          continue;
        }

        const titleLower = title.toLowerCase();
        const venueLower = venueName.toLowerCase();
        if (
          !titleLower.includes("tübingen") &&
          !titleLower.includes("tuebingen") &&
          !venueLower.includes("tübingen") &&
          !venueLower.includes("tuebingen") &&
          !contextText.includes("tübingen") &&
          !contextText.includes("tuebingen")
        ) {
          continue;
        }

        title = title.replace(/\s+/g, " ").trim();
        if (!title) {
          title = venueName || "Diginights Event";
        }

        if (title.length > 80) {
          title = `${title.slice(0, 77)}...`;
        }

        let parsedDate = null;
        if (dateText && dateText.includes("T")) {
          const isoDate = new Date(dateText);
          if (!Number.isNaN(isoDate.getTime()) && isoDate > new Date()) {
            parsedDate = isoDate;
          }
        }

        if (!parsedDate && dateText) {
          parsedDate = parseGermanDate(dateText);
        }

        if (!parsedDate || parsedDate < new Date()) {
          continue;
        }

        const coords = getVenueCoordinates(venueName);
        if (!coords) {
          continue;
        }

        const eventHref = anchorElem.attr("href")?.trim();
        const externalLink = eventHref
          ? new URL(eventHref, diginightsUrl).toString()
          : diginightsUrl;

        aggregatedEvents.push({
          id: generateEventId("diginights", parsedDate, title),
          title,
          description: "Diginights Event in Tübingen",
          starts_at: parsedDate.toISOString(),
          ends_at: new Date(parsedDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
          public_lat: coords.lat,
          public_lng: coords.lng,
          external_link: externalLink,
          vibe_label: venueName.length > 0 ? venueName : "Diginights",
          location_name: venueName || "Diginights",
          music_genre: inferMusicGenre(title),
        });
      }
    } catch (error) {
      console.warn(
        `[worker] Diginights source failed (${diginightsUrl}):`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  if (!aggregatedEvents.length) {
    console.warn("[worker] Diginights returned 0 events across all fallback URLs.");
    return [];
  }

  const uniqueById = new Map();
  for (const event of aggregatedEvents) {
    if (!uniqueById.has(event.id)) {
      uniqueById.set(event.id, event);
    }
  }

  return Array.from(uniqueById.values());
}

function toDbRow(event) {
  return {
    id: event.id,
    source: SOURCE,
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
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const runStartedAt = new Date().toISOString();
  const rows = events.map((event) => ({
    ...toDbRow(event),
    scraped_at: runStartedAt,
  }));

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("external_events_cache")
      .upsert(rows, { onConflict: "id" });

    if (upsertError) {
      throw new Error(`Upsert failed: ${upsertError.message}`);
    }
  }

  const nowIso = new Date().toISOString();

  const staleResult = await supabase
    .from("external_events_cache")
    .delete()
    .eq("source", SOURCE)
    .lt("scraped_at", runStartedAt);

  if (staleResult.error) {
    throw new Error(`Cleanup (stale) failed: ${staleResult.error.message}`);
  }

  const expiredResult = await supabase
    .from("external_events_cache")
    .delete()
    .eq("source", SOURCE)
    .lt("ends_at", nowIso);

  const deleteError = expiredResult.error;

  if (deleteError) {
    throw new Error(`Cleanup (expired) failed: ${deleteError.message}`);
  }

  return { upserted: rows.length };
}

async function main() {
  const startedAt = Date.now();
  console.log("[worker] Starting external events sync...");

  const [kuckuck, clubhaus, schlachthaus, diginights, epplehaus] = await Promise.all([
    fetchKuckuckEvents(),
    fetchFsrvvClubhausEvents(),
    fetchSchlachthausEvents(),
    fetchDiginightsEvents(),
    fetchEpplehausEvents(),
  ]);

  const merged = dedupeAndSort([...kuckuck, ...clubhaus, ...schlachthaus, ...diginights, ...epplehaus]);
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
