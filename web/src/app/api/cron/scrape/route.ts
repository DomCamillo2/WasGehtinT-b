import { NextResponse } from "next/server";

import { inferExternalCategoryFields } from "@/lib/data";
import {
  fetchLatestInstagramPosts,
  parseEventsFromCaptions,
  type InstagramPostCandidate,
} from "@/lib/scrape-events";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { berlinWallTimeToUtc } from "@/lib/timezone-berlin";

export const runtime = "nodejs";

const DEFAULT_VENUES = [
  "frau_holle_tuebingen",
  "stadtkindtuebingen",
  "kuckuck_bar_tuebingen",
  "queerspaceparties",
  "luscht.tuebingen",
  "zahnis_tuebingen",
  "schwarzes_schaf_tuebingen",
  "fsk.tuebingen",
  "fachschaftmedizintuebingen",
  "fachschaftmewi",
  "schoener_wohnen_tuebingen",
  "schoener_leben_tuebingen",
];

const CONFIGURED_VENUES =
  process.env.INSTAGRAM_SCRAPE_VENUES
    ?.split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0) ?? [];

const VENUES = Array.from(
  new Set([...DEFAULT_VENUES, ...CONFIGURED_VENUES].map((value) => value.toLowerCase())),
);
const INSTAGRAM_SOURCE = "instagram";
const SCRAPE_COOLDOWN_MINUTES = (() => {
  const parsed = Number(process.env.INSTAGRAM_SCRAPE_COOLDOWN_MINUTES ?? "1320");
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 1320;
  }
  return Math.floor(parsed);
})();
const MAX_VENUES_PER_RUN = (() => {
  const parsed = Number(process.env.INSTAGRAM_MAX_VENUES_PER_RUN ?? "8");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 8;
  }
  return Math.min(Math.floor(parsed), Math.max(VENUES.length, 1), 16);
})();
const MAX_POSTS_PER_VENUE = (() => {
  const parsed = Number(process.env.INSTAGRAM_MAX_POSTS_PER_VENUE ?? "3");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 3;
  }
  return Math.min(Math.floor(parsed), 5);
})();
const MAX_GEMINI_CAPTIONS_PER_RUN = (() => {
  const parsed = Number(process.env.INSTAGRAM_MAX_GEMINI_CAPTIONS_PER_RUN ?? "24");
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 24;
  }
  return Math.min(Math.floor(parsed), 48);
})();
const EVENT_HINT_REGEX = /(\d{1,2}\.\d{1,2}\.|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}:\d{2}\b|\buhr\b|\beinlass\b|\bstart\b|\bline\s*up\b|\btickets?\b|\bheute\b|\bmorgen\b|\bfreitag\b|\bsamstag\b|\bsonntag\b|\bmo\b|\bdi\b|\bmi\b|\bdo\b|\bfr\b|\bsa\b|\bso\b)/i;
const INTERNAL_ADMIN_REGEX = /\bf[\s\-]?sitzung\b|\bfachschaftssitzung\b|\btagesordnung\b|\bto[\s\-]?punkt\b|\babstimmung\b|\bproto(?:koll)?\b|\bwahl(?:en)?\b|\bkandidatur\b|\bamtszeit\b/i;
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseStartDate(date: string, time: string): Date {
  const hhmm = time.match(/(\d{1,2}):(\d{2})/);
  const hourOnly = time.match(/(\d{1,2})\s*(uhr)?/i);
  const hour = hhmm ? Number(hhmm[1]) : hourOnly ? Number(hourOnly[1]) : 20;
  const minute = hhmm ? Number(hhmm[2]) : 0;

  const safeHour = Number.isFinite(hour) ? Math.min(Math.max(hour, 0), 23) : 20;
  const safeMinute = Number.isFinite(minute) ? Math.min(Math.max(minute, 0), 59) : 0;

  return berlinWallTimeToUtc(date, safeHour, safeMinute);
}

function buildEventId(venue: string, title: string, date: string, location: string): string {
  return `${INSTAGRAM_SOURCE}-${slugify(venue)}-${date}-${slugify(title)}-${slugify(location)}`;
}

function dateRangeForDay(date: string) {
  const start = berlinWallTimeToUtc(date, 0, 0);
  const almostMidnight = berlinWallTimeToUtc(date, 23, 59);
  const end = new Date(almostMidnight.getTime() + 60 * 1000 - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function instagramVenueVibeLabel(venueHandle: string): string {
  const key = venueHandle.toLowerCase().replace(/^@/, "").replace(/\./g, "_");
  const map: Record<string, string> = {
    frau_holle_tuebingen: "Frau Holle",
    kuckuck_bar_tuebingen: "Kuckuck",
    schwarzes_schaf_tuebingen: "Schwarzes Schaf",
    stadtkindtuebingen: "Stadtkind",
    queerspaceparties: "Queerspace",
    luscht_tuebingen: "Luscht",
    zahnis_tuebingen: "Zahnis",
    fsk_tuebingen: "FSK",
    fachschaftmedizintuebingen: "Fachschaft Medizin",
    fachschaftmewi: "Fachschaft MeWi",
    schoener_wohnen_tuebingen: "Schöner Wohnen",
    schoener_leben_tuebingen: "Schöner Leben",
  };
  return map[key] ?? resolveFallbackLocation(venueHandle).split(",")[0]?.trim() ?? "Instagram";
}

function isMissingColumnError(message: string, ...columnNames: string[]): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("column") && columnNames.some((column) => normalized.includes(column.toLowerCase()));
}

function sanitizeFilterValue(value: string): string {
  return value.replace(/[,()]/g, "");
}

function pickVenuesForRun(venues: string[], maxVenues: number): string[] {
  if (venues.length <= maxVenues) {
    return venues;
  }

  const now = new Date();
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1);
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dayOfYear = Math.floor((nowUtc - startOfYear) / (24 * 60 * 60 * 1000));
  const offset = dayOfYear % venues.length;

  return Array.from({ length: maxVenues }, (_, index) => venues[(offset + index) % venues.length]);
}

function isLikelyEventCaption(caption: string): boolean {
  if (INTERNAL_ADMIN_REGEX.test(caption)) return false;
  return EVENT_HINT_REGEX.test(caption);
}

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

function resolveFallbackLocation(venue: string): string {
  const normalized = venue.toLowerCase();
  if (normalized.includes("zahnis")) {
    return "Zahnis Tuebingen";
  }
  if (normalized.includes("schaf")) {
    return "Schwarzes Schaf, Tuebingen";
  }
  if (normalized.includes("holle")) {
    return "Holle Tuebingen";
  }
  if (normalized.includes("fsk")) {
    return "FSK, Tuebingen";
  }
  if (normalized.includes("fachschaftmedizin")) {
    return "Fachschaft Medizin, Tuebingen";
  }
  if (normalized.includes("fachschaftmewi")) {
    return "Fachschaft MeWi, Tuebingen";
  }
  if (normalized.includes("fachschaft")) {
    return "Fachschaft, Tuebingen";
  }
  return "Tuebingen";
}

function parseCaptionDate(caption: string): string | null {
  const match = caption.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(day) || !Number.isInteger(month) || day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  const now = new Date();
  let year = now.getUTCFullYear();
  if (match[3]) {
    const parsedYear = Number(match[3]);
    year = match[3].length === 2 ? 2000 + parsedYear : parsedYear;
    // Guard against implausible explicit years from noisy captions/OCR.
    const currentYear = now.getUTCFullYear();
    if (year > currentYear + 1 || year < currentYear - 1) {
      year = currentYear;
    }
  }

  let candidate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  if (!match[3] && candidate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
    candidate = new Date(Date.UTC(year + 1, month - 1, day, 12, 0, 0));
  }

  return candidate.toISOString().slice(0, 10);
}

function normalizeEventDateForInstagram(dateIso: string): string {
  const match = dateIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateIso;
  const now = new Date();
  const nowYear = now.getUTCFullYear();
  const month = Number(match[2]);
  const day = Number(match[3]);

  let candidate = new Date(Date.UTC(Number(match[1]), month - 1, day, 12, 0, 0));
  if (Number.isNaN(candidate.getTime())) return dateIso;

  const oneDayMs = 24 * 60 * 60 * 1000;
  const maxFutureMs = 370 * oneDayMs;
  const delta = candidate.getTime() - now.getTime();
  const tooOld = delta < -oneDayMs;
  const tooFarFuture = delta > maxFutureMs;
  if (!tooOld && !tooFarFuture) {
    return dateIso;
  }

  // Normalize implausible years to current/next year based on calendar proximity.
  const currentYearDate = new Date(Date.UTC(nowYear, month - 1, day, 12, 0, 0));
  const nextYearDate = new Date(Date.UTC(nowYear + 1, month - 1, day, 12, 0, 0));
  candidate = currentYearDate.getTime() >= now.getTime() - oneDayMs ? currentYearDate : nextYearDate;
  return candidate.toISOString().slice(0, 10);
}

function parseCaptionTime(caption: string): string {
  const hhmm = caption.match(/(\d{1,2})[:.](\d{2})/);
  if (hhmm) {
    const hour = Math.min(Math.max(Number(hhmm[1]), 0), 23);
    const minute = Math.min(Math.max(Number(hhmm[2]), 0), 59);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const uhr = caption.match(/\b(\d{1,2})\s*uhr\b/i);
  if (uhr) {
    const hour = Math.min(Math.max(Number(uhr[1]), 0), 23);
    return `${String(hour).padStart(2, "0")}:00`;
  }

  return "20:00";
}

function parseEventsFromCaptionFallback(caption: string, venue: string): Array<{ title: string; date: string; time: string; location: string; description: string }> {
  const normalizedCaption = caption.replace(/\s+/g, " ").trim();
  if (!normalizedCaption) {
    return [];
  }

  const date = parseCaptionDate(normalizedCaption);
  if (!date) {
    return [];
  }

  const time = parseCaptionTime(normalizedCaption);
  const firstLine = caption
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "";
  const title = firstLine.replace(/[#*_]+/g, "").slice(0, 90).trim() || `${venue} Event`;

  return [{
    title,
    date,
    time,
    location: resolveFallbackLocation(venue),
    description: normalizedCaption.slice(0, 260),
  }];
}

async function isPostAlreadyProcessed(post: InstagramPostCandidate): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const externalId = sanitizeFilterValue(post.externalId);
  const sourceUrl = sanitizeFilterValue(post.sourceUrl);

  const strictCheck = await supabase
    .from("external_events_cache")
    .select("id")
    .or(`external_id.eq.${externalId},source_url.eq.${sourceUrl}`)
    .limit(1);

  if (!strictCheck.error) {
    return Array.isArray(strictCheck.data) && strictCheck.data.length > 0;
  }

  if (!isMissingColumnError(strictCheck.error.message, "external_id", "source_url")) {
    throw new Error(`Post dedupe check failed: ${strictCheck.error.message}`);
  }

  const fallbackCheck = await supabase
    .from("external_events_cache")
    .select("id")
    .or(`id.eq.${externalId},external_link.eq.${sourceUrl}`)
    .limit(1);

  if (fallbackCheck.error) {
    throw new Error(`Fallback dedupe check failed: ${fallbackCheck.error.message}`);
  }

  return Array.isArray(fallbackCheck.data) && fallbackCheck.data.length > 0;
}

async function insertEventRow(input: {
  venue: string;
  post: InstagramPostCandidate;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  musicGenre: string | null;
}): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const startsAt = parseStartDate(input.date, input.time);

  if (Number.isNaN(startsAt.getTime())) {
    return false;
  }

  const { start, end } = dateRangeForDay(input.date);
  const duplicateEventCheck = await supabase
    .from("external_events_cache")
    .select("id")
    .eq("title", input.title)
    .eq("location_name", input.location)
    .gte("starts_at", start)
    .lte("starts_at", end)
    .limit(1);

  if (duplicateEventCheck.error) {
    throw new Error(`Event dedupe check failed: ${duplicateEventCheck.error.message}`);
  }

  if (duplicateEventCheck.data && duplicateEventCheck.data.length > 0) {
    return false;
  }

  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
  const scrapedAt = new Date().toISOString();
  const vibeLabel = instagramVenueVibeLabel(input.venue);
  const inferred = inferExternalCategoryFields({
    title: input.title,
    description: input.description,
    vibe_label: vibeLabel,
    location_name: input.location,
    starts_at: startsAt.toISOString(),
  });

  const extendedRow = {
    id: buildEventId(input.venue, input.title, input.date, input.location),
    source: INSTAGRAM_SOURCE,
    external_id: input.post.externalId,
    source_url: input.post.sourceUrl,
    title: input.title,
    description: input.description,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    public_lat: null,
    public_lng: null,
    external_link: input.post.sourceUrl,
    vibe_label: vibeLabel,
    location_name: input.location,
    music_genre: input.musicGenre,
    scraped_at: scrapedAt,
    category_slug: inferred.category_slug,
    category_label: inferred.category_label,
    event_scope: inferred.event_scope,
    is_all_day: false,
    audience_label: null,
    price_info: null,
  };

  const extendedInsert = await supabase
    .from("external_events_cache")
    .insert(extendedRow);

  if (!extendedInsert.error) {
    return true;
  }

  if (!isMissingColumnError(extendedInsert.error.message, "external_id", "source_url")) {
    throw new Error(`Insert failed: ${extendedInsert.error.message}`);
  }

  const fallbackRow = {
    id: buildEventId(input.venue, input.title, input.date, input.location),
    source: INSTAGRAM_SOURCE,
    title: input.title,
    description: input.description,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    public_lat: null,
    public_lng: null,
    external_link: input.post.sourceUrl,
    vibe_label: vibeLabel,
    location_name: input.location,
    music_genre: input.musicGenre,
    scraped_at: scrapedAt,
  };

  const fallbackInsert = await supabase
    .from("external_events_cache")
    .insert(fallbackRow);

  if (fallbackInsert.error) {
    throw new Error(`Fallback insert failed: ${fallbackInsert.error.message}`);
  }

  return true;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

async function handleCronScrape(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const forceRun = ["1", "true", "yes"].includes((url.searchParams.get("force") ?? "").toLowerCase());
  const supabase = getSupabaseAdmin();
  const latestInstagramScrape = await supabase
    .from("external_events_cache")
    .select("scraped_at")
    .eq("source", INSTAGRAM_SOURCE)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!forceRun && !latestInstagramScrape.error && latestInstagramScrape.data?.scraped_at && SCRAPE_COOLDOWN_MINUTES > 0) {
    const lastScrapedMs = new Date(latestInstagramScrape.data.scraped_at).getTime();
    const cooldownMs = SCRAPE_COOLDOWN_MINUTES * 60 * 1000;
    if (Number.isFinite(lastScrapedMs) && Date.now() - lastScrapedMs < cooldownMs) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "cooldown-active",
        cooldownMinutes: SCRAPE_COOLDOWN_MINUTES,
        lastScrapedAt: latestInstagramScrape.data.scraped_at,
      });
    }
  }

  let totalFound = 0;
  let newInserted = 0;
  let postErrors = 0;
  let parseFailures = 0;
  let skippedByCaptionHeuristic = 0;
  let skippedByGeminiBudget = 0;
  let geminiCaptionsUsed = 0;
  const venueErrors: string[] = [];
  const runVenues = pickVenuesForRun(VENUES, MAX_VENUES_PER_RUN);

  for (const venue of runVenues) {
    try {
      const posts = await fetchLatestInstagramPosts(venue, MAX_POSTS_PER_VENUE);
      totalFound += posts.length;

      // Filter down to new, event-like posts before touching Gemini.
      let skippedCachedPosts = 0;
      const newPosts: InstagramPostCandidate[] = [];
      for (const post of posts) {
        let alreadyProcessed = false;
        try {
          alreadyProcessed = await isPostAlreadyProcessed(post);
        } catch (error) {
          postErrors += 1;
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`[cron/scrape] ${venue}: dedupe check failed for ${post.externalId}: ${message}`);
          continue;
        }

        if (alreadyProcessed) {
          skippedCachedPosts += 1;
          continue;
        }

        if (!isLikelyEventCaption(post.caption)) {
          skippedByCaptionHeuristic += 1;
          continue;
        }

        newPosts.push(post);
      }

      // Single Gemini call for all new captions in this venue.
      let insertedForVenue = 0;
      if (newPosts.length > 0) {
        const remainingGeminiBudget = Math.max(0, MAX_GEMINI_CAPTIONS_PER_RUN - geminiCaptionsUsed);
        const postsForGemini = remainingGeminiBudget > 0
          ? newPosts.slice(0, remainingGeminiBudget)
          : [];
        const postsForFallbackOnly = newPosts.slice(postsForGemini.length);
        skippedByGeminiBudget += postsForFallbackOnly.length;

        const captions = postsForGemini.map((p) => p.caption);
        let allParsed: Awaited<ReturnType<typeof parseEventsFromCaptions>> = [];
        if (captions.length > 0) {
          try {
            allParsed = await parseEventsFromCaptions(captions);
            geminiCaptionsUsed += captions.length;
          } catch (error) {
            parseFailures += 1;
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`[cron/scrape] ${venue}: caption parse failed: ${message}`);
          }
        }

        // Fallback per-post if Gemini returned nothing.
        const eventsToInsert: Array<{ post: InstagramPostCandidate; event: ReturnType<typeof parseEventsFromCaptionFallback>[0] }> = [];
        if (allParsed.length > 0) {
          for (const event of allParsed) {
            event.date = normalizeEventDateForInstagram(event.date);
            // Best-effort: attribute event to the post whose caption contains the event date.
            const matchedPost = postsForGemini.find((p) => p.caption.includes(event.date.slice(5).replace("-", ".")))
              ?? postsForGemini[0];
            if (matchedPost) {
              eventsToInsert.push({ post: matchedPost, event });
            }
          }
        }

        if (allParsed.length === 0 || postsForFallbackOnly.length > 0) {
          const fallbackPosts = allParsed.length === 0 ? newPosts : postsForFallbackOnly;
          for (const post of fallbackPosts) {
            const fallbackEvents = parseEventsFromCaptionFallback(post.caption, venue);
            for (const event of fallbackEvents) {
              event.date = normalizeEventDateForInstagram(event.date);
              eventsToInsert.push({ post, event });
            }
          }
        }

        for (const { post, event } of eventsToInsert) {
          const normalizedTitle = event.title.trim();
          const normalizedLocation = event.location.trim();
          const inferredMusicGenre = inferMusicGenre(`${normalizedTitle} ${event.description ?? ""}`);

          const inserted = await insertEventRow({
            venue,
            post,
            title: normalizedTitle,
            description: event.description,
            date: event.date,
            time: event.time,
            location: normalizedLocation,
            musicGenre: inferredMusicGenre,
          });

          if (inserted) {
            insertedForVenue += 1;
            newInserted += 1;
          }
        }
      }

      console.log(
        `[cron/scrape] ${venue}: posts=${posts.length}, skipped_cached=${skippedCachedPosts}, inserted=${insertedForVenue}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      venueErrors.push(`${venue}: ${message}`);
      console.error(`[cron/scrape] ${venue}: failed: ${message}`);
    }
  }

  const success = venueErrors.length === 0;

  return NextResponse.json({
    success,
    skipped: false,
    forced: forceRun,
    venuesChecked: runVenues,
    maxVenuesPerRun: MAX_VENUES_PER_RUN,
    maxPostsPerVenue: MAX_POSTS_PER_VENUE,
    totalFound,
    newInserted,
    postErrors,
    parseFailures,
    skippedByCaptionHeuristic,
    skippedByGeminiBudget,
    geminiCaptionsUsed,
    maxGeminiCaptionsPerRun: MAX_GEMINI_CAPTIONS_PER_RUN,
    venueErrors,
  });
}

export async function GET(request: Request) {
  return handleCronScrape(request);
}

export async function POST(request: Request) {
  return handleCronScrape(request);
}
