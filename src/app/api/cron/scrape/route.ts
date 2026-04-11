import { NextResponse } from "next/server";

import {
  fetchLatestInstagramPosts,
  parseEventsFromCaptions,
  type InstagramPostCandidate,
} from "@/lib/scrape-events";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const VENUES = ["frau_holle_tuebingen", "schwarzesschaf.tuebingen"];
const INSTAGRAM_SOURCE = "instagram";
const MAX_POSTS_PER_VENUE = 3;

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

  let totalFound = 0;
  let newInserted = 0;

  for (const venue of VENUES) {
    const posts = await fetchLatestInstagramPosts(venue, MAX_POSTS_PER_VENUE);
    totalFound += posts.length;

    let skippedCachedPosts = 0;
    let insertedForVenue = 0;
    for (const post of posts) {
      const alreadyProcessed = await isPostAlreadyProcessed(post);
      if (alreadyProcessed) {
        skippedCachedPosts += 1;
        continue;
      }

      const parsedEvents = await parseEventsFromCaptions([post.caption]);
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
  }

  return NextResponse.json({
    success: true,
    totalFound,
    newInserted,
  });
}

export async function GET(request: Request) {
  return handleCronScrape(request);
}

export async function POST(request: Request) {
  return handleCronScrape(request);
}
