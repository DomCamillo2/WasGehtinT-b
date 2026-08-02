import { PartyCard } from "@/lib/types";
import { externalEventsFetchStaleSourceKeys } from "@/lib/external-event-sources";
import { sanitizeExternalEventTitle } from "@/lib/sanitize-event-title";
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
  sourcesSwept: string[];
};

export type SyncExternalEventsOptions = {
  /**
   * Sources that completed successfully this run (including empty results).
   * Only these are stale-swept. Failed sources keep their last good rows.
   * When omitted, falls back to sweeping all known official sources (legacy).
   */
  sourcesSucceeded?: string[];
};

function normalizeIngestSource(event: PartyCard): string {
  const raw = (event.source ?? "").trim();
  return raw.length > 0 ? raw : DEFAULT_INGEST_SOURCE;
}

function sanitizeEventForCache(event: PartyCard): PartyCard {
  const title = sanitizeExternalEventTitle(event.title, {
    description: event.description,
    externalLink: event.external_link,
    fallback: event.vibe_label || event.location_name || "Event",
  });
  if (title === event.title) return event;
  return { ...event, title };
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

async function deleteStaleForSources(sources: string[], scrapedAt: string): Promise<void> {
  if (sources.length === 0) return;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("external_events_cache")
    .delete()
    .in("source", sources)
    .lt("scraped_at", scrapedAt);

  if (error) {
    throw new Error(`Deleting stale external events failed: ${error.message}`);
  }
}

export async function syncExternalEventsToCache(
  events: PartyCard[],
  options: SyncExternalEventsOptions = {},
): Promise<ExternalEventsSyncResult> {
  const supabase = getSupabaseAdmin();
  const scrapedAt = new Date().toISOString();
  const nowIso = new Date().toISOString();
  const maxStartsAtIso = new Date(Date.now() + MAX_FUTURE_CACHE_MS).toISOString();
  let usedBaseFallback = false;

  const knownSources = new Set(externalEventsFetchStaleSourceKeys());
  const sourcesSucceeded = (options.sourcesSucceeded ?? [...knownSources])
    .map((source) => source.trim())
    .filter((source) => source.length > 0 && knownSources.has(source));

  const sanitizedEvents = events.map(sanitizeEventForCache);

  if (sanitizedEvents.length === 0) {
    await deleteExpiredRows(nowIso);
    const deletedFarFuture = await deleteFarFutureGhostRows(maxStartsAtIso);

    // Empty-but-successful sources should still clear their ghosts.
    // If nothing succeeded (total scrape failure), keep last good snapshot.
    if (sourcesSucceeded.length === 0) {
      console.warn(
        "[external-events-cache] Refresh produced zero events and no successful sources — keeping last good cache.",
      );
      return {
        upserted: 0,
        usedBaseFallback: false,
        deletedStale: false,
        deletedExpired: true,
        deletedFarFuture,
        sourcesSwept: [],
      };
    }

    console.warn(
      `[external-events-cache] Refresh produced zero events — sweeping successful empty sources: ${sourcesSucceeded.join(", ")}`,
    );
    await deleteStaleForSources(sourcesSucceeded, scrapedAt);
    return {
      upserted: 0,
      usedBaseFallback: false,
      deletedStale: true,
      deletedExpired: true,
      deletedFarFuture,
      sourcesSwept: sourcesSucceeded,
    };
  }

  const extendedRows = sanitizedEvents.map((event) => buildExtendedRow(event, scrapedAt));
  const baseRows = sanitizedEvents.map((event) => buildBaseRow(event, scrapedAt));

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

  await deleteStaleForSources(sourcesSucceeded, scrapedAt);
  await deleteExpiredRows(nowIso);
  const deletedFarFuture = await deleteFarFutureGhostRows(maxStartsAtIso);

  return {
    upserted: extendedRows.length,
    usedBaseFallback,
    deletedStale: sourcesSucceeded.length > 0,
    deletedExpired: true,
    deletedFarFuture,
    sourcesSwept: sourcesSucceeded,
  };
}
