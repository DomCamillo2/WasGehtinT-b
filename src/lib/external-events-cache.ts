import { PartyCard } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const OFFICIAL_SCRAPER_SOURCE = "official-scraper";

function buildBaseRow(event: PartyCard, scrapedAt: string) {
  return {
    id: event.id,
    source: OFFICIAL_SCRAPER_SOURCE,
    title: event.title,
    description: event.description ?? null,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    public_lat: event.public_lat ?? null,
    public_lng: event.public_lng ?? null,
    external_link: event.external_link ?? null,
    vibe_label: event.vibe_label,
    location_name: event.location_name ?? null,
    music_genre: event.music_genre ?? null,
    scraped_at: scrapedAt,
  };
}

function buildExtendedRow(event: PartyCard, scrapedAt: string) {
  return {
    ...buildBaseRow(event, scrapedAt),
    category_slug: event.category_slug ?? null,
    event_scope: event.event_scope ?? null,
    is_all_day: event.is_all_day === true,
    audience_label: event.audience_label ?? null,
    price_info: event.price_info ?? null,
  };
}

function isUnknownColumnError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("column") && (
    normalized.includes("category_slug") ||
    normalized.includes("event_scope") ||
    normalized.includes("is_all_day") ||
    normalized.includes("audience_label") ||
    normalized.includes("price_info")
  );
}

export async function syncExternalEventsToCache(events: PartyCard[]) {
  const supabase = getSupabaseAdmin();
  const scrapedAt = new Date().toISOString();
  const nowIso = new Date().toISOString();

  const extendedRows = events.map((event) => buildExtendedRow(event, scrapedAt));
  const baseRows = events.map((event) => buildBaseRow(event, scrapedAt));

  if (extendedRows.length > 0) {
    const extendedUpsert = await supabase
      .from("external_events_cache")
      .upsert(extendedRows, { onConflict: "id" });

    if (extendedUpsert.error) {
      if (!isUnknownColumnError(extendedUpsert.error.message)) {
        throw new Error(`Upsert external events failed: ${extendedUpsert.error.message}`);
      }

      const baseUpsert = await supabase
        .from("external_events_cache")
        .upsert(baseRows, { onConflict: "id" });

      if (baseUpsert.error) {
        throw new Error(`Upsert external events failed: ${baseUpsert.error.message}`);
      }
    }
  }

  const { error: staleDeleteError } = await supabase
    .from("external_events_cache")
    .delete()
    .eq("source", OFFICIAL_SCRAPER_SOURCE)
    .lt("scraped_at", scrapedAt);

  if (staleDeleteError) {
    throw new Error(`Deleting stale external events failed: ${staleDeleteError.message}`);
  }

  const { error: expiredDeleteError } = await supabase
    .from("external_events_cache")
    .delete()
    .eq("source", OFFICIAL_SCRAPER_SOURCE)
    .lt("ends_at", nowIso);

  if (expiredDeleteError) {
    throw new Error(`Deleting expired external events failed: ${expiredDeleteError.message}`);
  }

  return { upserted: extendedRows.length };
}
