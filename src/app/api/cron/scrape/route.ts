import { NextResponse } from "next/server";

import {
  fetchLatestInstagramPosts,
  parseEventsFromCaptions,
  type InstagramPostCandidate,
} from "@/lib/scrape-events";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const DEFAULT_VENUES = [
  "frau_holle_tuebingen",
  "schwarzes_schaf_tuebingen",
  "schwarzesschaf_tuebingen",
];

const VENUES = (
  process.env.INSTAGRAM_SCRAPE_VENUES
    ?.split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0) ?? DEFAULT_VENUES
);
const INSTAGRAM_SOURCE = "instagram";
const SCRAPE_COOLDOWN_MINUTES = (() => {
  const parsed = Number(process.env.INSTAGRAM_SCRAPE_COOLDOWN_MINUTES ?? "360");
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 360;
  }
  return Math.floor(parsed);
})();
const MAX_VENUES_PER_RUN = (() => {
  const parsed = Number(process.env.INSTAGRAM_MAX_VENUES_PER_RUN ?? "2");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 2;
  }
  return Math.min(Math.floor(parsed), Math.max(VENUES.length, 1));
})();
const MAX_POSTS_PER_VENUE = (() => {
  const parsed = Number(process.env.INSTAGRAM_MAX_POSTS_PER_VENUE ?? "1");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return Math.min(Math.floor(parsed), 3);
})();
const EVENT_HINT_REGEX = /(\d{1,2}\.\d{1,2}\.|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}:\d{2}\b|\buhr\b|\beinlass\b|\bstart\b|\bline\s*up\b|\btickets?\b|\bheute\b|\bmorgen\b|\bfreitag\b|\bsamstag\b|\bsonntag\b|\bmo\b|\bdi\b|\bmi\b|\bdo\b|\bfr\b|\bsa\b|\bso\b)/i;

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

  return new Date(`${date}T${String(safeHour).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")}:00.000Z`);
}

function buildEventId(venue: string, title: string, date: string, location: string): string {
  return `${INSTAGRAM_SOURCE}-${slugify(venue)}-${date}-${slugify(title)}-${slugify(location)}`;
}

function dateRangeForDay(date: string) {
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;
  return { start, end };
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
  return EVENT_HINT_REGEX.test(caption);
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
    vibe_label: "Instagram",
    location_name: input.location,
    music_genre: null,
    scraped_at: scrapedAt,
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
    vibe_label: "Instagram",
    location_name: input.location,
    music_genre: null,
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
  const authHeader = request.headers.get("authorization")?.trim();

  if (!secret) {
    return false;
  }

  return authHeader === `Bearer ${secret}`;
}

async function handleCronScrape(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const latestInstagramScrape = await supabase
    .from("external_events_cache")
    .select("scraped_at")
    .eq("source", INSTAGRAM_SOURCE)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestInstagramScrape.error && latestInstagramScrape.data?.scraped_at && SCRAPE_COOLDOWN_MINUTES > 0) {
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
  const venueErrors: string[] = [];
  const runVenues = pickVenuesForRun(VENUES, MAX_VENUES_PER_RUN);

  for (const venue of runVenues) {
    try {
      const posts = await fetchLatestInstagramPosts(venue, MAX_POSTS_PER_VENUE);
      totalFound += posts.length;

      let skippedCachedPosts = 0;
      let insertedForVenue = 0;
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

        let parsedEvents: Awaited<ReturnType<typeof parseEventsFromCaptions>> = [];
        try {
          parsedEvents = await parseEventsFromCaptions([post.caption]);
        } catch (error) {
          parseFailures += 1;
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`[cron/scrape] ${venue}: caption parse failed for ${post.externalId}: ${message}`);
          continue;
        }

        for (const event of parsedEvents) {
          const normalizedTitle = event.title.trim();
          const normalizedLocation = event.location.trim();

          const inserted = await insertEventRow({
            venue,
            post,
            title: normalizedTitle,
            description: event.description,
            date: event.date,
            time: event.time,
            location: normalizedLocation,
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
    venuesChecked: runVenues,
    maxVenuesPerRun: MAX_VENUES_PER_RUN,
    maxPostsPerVenue: MAX_POSTS_PER_VENUE,
    totalFound,
    newInserted,
    postErrors,
    parseFailures,
    skippedByCaptionHeuristic,
    venueErrors,
  });
}

export async function GET(request: Request) {
  return handleCronScrape(request);
}

export async function POST(request: Request) {
  return handleCronScrape(request);
}
