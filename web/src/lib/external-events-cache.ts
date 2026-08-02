import { PartyCard } from "@/lib/types";
import { externalEventsFetchStaleSourceKeys } from "@/lib/external-event-sources";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_INGEST_SOURCE = "official-scraper";

/** Drop ghost rows invented by year-bump scrapers (July program → July next year). */
const MAX_FUTURE_CACHE_MS = 160 * 24 * 60 * 60 * 1000;

export type ExternalEventsSyncResult = {
  upserted: number;
  usedBaseFallback: boolean;
  deletedStale: boolean;
  deletedExpired: boolean;
  deletedFarFuture: boolean;
};

function normalizeIngestSource(event: PartyCard): string {
  const raw = (event.source ?? "").trim();
  return raw.length > 0 ? raw : DEFAULT_INGEST_SOURCE;
}

function buildBaseRow(event: PartyCard, scrapedAt: string) {
  return {
    id: event.id,
    source: normalizeIngestSource(event),
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
    category_label: event.category_label ?? null,
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
    normalized.includes("category_label") ||
    normalized.includes("event_scope") ||
    normalized.includes("is_all_day") ||
    normalized.includes("audience_label") ||
    normalized.includes("price_info")
  );
}

async function deleteExpiredRows(nowIso: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("external_events_cache").delete().lt("ends_at", nowIso);
  if (error) {
    throw new Error(`Deleting expired external events failed: ${error.message}`);
  }
}

async function deleteFarFutureGhostRows(maxStartsAtIso: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const sources = externalEventsFetchStaleSourceKeys();
  const { error, count } = await supabase
    .from("external_events_cache")
    .delete({ count: "exact" })
    .in("source", sources)
    .gt("starts_at", maxStartsAtIso);

  if (error) {
    throw new Error(`Deleting far-future external events failed: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

async function deleteStaleForKnownSources(scrapedAt: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  // Always sweep every official fetch source — empty scrapers must clear prior ghosts.
  const { error } = await supabase
    .from("external_events_cache")
    .delete()
    .in("source", externalEventsFetchStaleSourceKeys())
    .lt("scraped_at", scrapedAt);

  if (error) {
    throw new Error(`Deleting stale external events failed: ${error.message}`);
  }
}

export async function syncExternalEventsToCache(events: PartyCard[]): Promise<ExternalEventsSyncResult> {
  const supabase = getSupabaseAdmin();
  const scrapedAt = new Date().toISOString();
  const nowIso = new Date().toISOString();
  const maxStartsAtIso = new Date(Date.now() + MAX_FUTURE_CACHE_MS).toISOString();
  let usedBaseFallback = false;

  if (events.length === 0) {
    console.warn(
      "[external-events-cache] Refresh produced zero events — skipping upsert/stale sweep, but clearing expired and far-future ghosts.",
    );
    await deleteExpiredRows(nowIso);
    const deletedFarFuture = await deleteFarFutureGhostRows(maxStartsAtIso);
    return {
      upserted: 0,
      usedBaseFallback: false,
      deletedStale: false,
      deletedExpired: true,
      deletedFarFuture,
    };
  }

  const extendedRows = events.map((event) => buildExtendedRow(event, scrapedAt));
  const baseRows = events.map((event) => buildBaseRow(event, scrapedAt));

  const extendedUpsert = await supabase
    .from("external_events_cache")
    .upsert(extendedRows, { onConflict: "id" });

  if (extendedUpsert.error) {
    if (!isUnknownColumnError(extendedUpsert.error.message)) {
      throw new Error(`Upsert external events failed: ${extendedUpsert.error.message}`);
    }

    usedBaseFallback = true;
    const baseUpsert = await supabase
      .from("external_events_cache")
      .upsert(baseRows, { onConflict: "id" });

    if (baseUpsert.error) {
      throw new Error(`Upsert external events failed: ${baseUpsert.error.message}`);
    }
  }

  await deleteStaleForKnownSources(scrapedAt);
  await deleteExpiredRows(nowIso);
  const deletedFarFuture = await deleteFarFutureGhostRows(maxStartsAtIso);

  return {
    upserted: extendedRows.length,
    usedBaseFallback,
    deletedStale: true,
    deletedExpired: true,
    deletedFarFuture,
  };
}
