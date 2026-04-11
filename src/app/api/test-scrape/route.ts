import { NextResponse } from "next/server";

import { scrapeInstagramEvents } from "@/lib/scrape-events";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const venue = searchParams.get("venue")?.trim() || "frau_holle_tuebingen";

  try {
    console.log(`[test-scrape] Starting scrape for venue: ${venue}`);
    const events = await scrapeInstagramEvents(venue);

    return NextResponse.json({ success: true, venue, events });
  } catch (error) {
    console.error("[test-scrape] Scrape failed", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
