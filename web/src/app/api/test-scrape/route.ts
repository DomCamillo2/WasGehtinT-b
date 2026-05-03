import { NextResponse } from "next/server";

import { scrapeInstagramEvents } from "@/lib/scrape-events";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const INSTAGRAM_SOURCE = "instagram-scraper";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization")?.trim();

  if (!secret) {
    return false;
  }

  return authHeader === `Bearer ${secret}`;
}

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

  // Keep event date deterministic even when time text is fuzzy.
  return new Date(`${date}T${String(safeHour).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")}:00.000Z`);
}

function buildCacheRows(venue: string, events: Awaited<ReturnType<typeof scrapeInstagramEvents>>) {
  const scrapedAt = new Date().toISOString();

  return events
    .map((event) => {
      const startsAt = parseStartDate(event.date, event.time);
      if (Number.isNaN(startsAt.getTime())) {
        return null;
      }

      const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
      const id = `${INSTAGRAM_SOURCE}-${slugify(venue)}-${event.date}-${slugify(event.title)}`;

      return {
        id,
        source: INSTAGRAM_SOURCE,
        title: event.title,
        description: event.description,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        public_lat: null,
        public_lng: null,
        external_link: `https://www.instagram.com/${venue.replace(/^@/, "")}/`,
        vibe_label: "Instagram",
        location_name: event.location,
        music_genre: null,
        scraped_at: scrapedAt,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  if (IS_PRODUCTION && process.env.ALLOW_TEST_SCRAPE_IN_PROD !== "true") {
    return NextResponse.json(
      {
        success: false,
        error: "disabled_in_production",
        message: "Test scrape endpoint is disabled in production by default.",
      },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const venue = searchParams.get("venue")?.trim() || "frau_holle_tuebingen";

  try {
    console.log(`[test-scrape] Starting scrape for venue: ${venue}`);
    const events = await scrapeInstagramEvents(venue);
    const rows = buildCacheRows(venue, events);

    if (rows.length > 0) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from("external_events_cache")
        .upsert(rows, { onConflict: "id" });

      if (error) {
        if (error.message.toLowerCase().includes("legacy api keys")) {
          throw new Error(
            "Supabase rejected legacy JWT keys. Set SUPABASE_SECRET_KEY (sb_secret_...) in .env.local and restart dev server.",
          );
        }
        throw new Error(`Saving events to Supabase failed: ${error.message}`);
      }
    }

    return NextResponse.json({ success: true, venue, events, saved: rows.length });
  } catch (error) {
    console.error("[test-scrape] Scrape failed", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
