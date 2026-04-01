import { PartyCard } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const OFFICIAL_SCRAPER_SOURCE = "official-scraper";

type CacheColumnName =
  | "id"
  | "source"
  | "title"
  | "description"
  | "starts_at"
  | "ends_at"
  | "public_lat"
  | "public_lng"
  | "external_link"
  | "vibe_label"
  | "location_name"
  | "music_genre"
  | "scraped_at"
  | "category_slug"
  | "event_scope"
  | "is_all_day"
  | "audience_label"
  | "price_info";

let cachedColumns: Set<string> | null = null;

async function getExternalEventsCacheColumns() {
  if (cachedColumns) {
    return cachedColumns;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .schema("information_schema")
    .from("columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", "external_events_cache");

  if (error) {
    throw new Error(`Could not inspect external_events_cache columns: ${error.message}`);
  }

  cachedColumns = new Set(
    ((data ?? []) as Array<{ column_name: string }>).map((row) => row.column_name),
  );

  return cachedColumns;
}

function buildBaseRow(event: PartyCard, scrapedAt: string): Record<CacheColumnName, unknown> {
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
    category_slug: event.category_slug ?? null,
    event_scope: event.event_scope ?? null,
    is_all_day: event.is_all_day === true,
    audience_label: event.audience_label ?? null,
    price_info: event.price_info ?? null,
  };
}

export async function syncExternalEventsToCache(events: PartyCard[]) {
  const supabase = getSupabaseAdmin();
  const supportedColumns = await getExternalEventsCacheColumns();
  const scrapedAt = new Date().toISOString();
  const nowIso = new Date().toISOString();

  const rows = events.map((event) => {
    const candidate = buildBaseRow(event, scrapedAt);
    const filteredEntries = Object.entries(candidate).filter(([key]) => supportedColumns.has(key));
    return Object.fromEntries(filteredEntries);
  });

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("external_events_cache")
      .upsert(rows, { onConflict: "id" });

    if (upsertError) {
      throw new Error(`Upsert external events failed: ${upsertError.message}`);
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

  return { upserted: rows.length };
}
