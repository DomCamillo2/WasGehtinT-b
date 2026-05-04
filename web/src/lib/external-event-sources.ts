/**
 * Ingest `source` values written to external_events_cache (fetch / refresh pipeline).
 * Keep aligned with scrapers in official-venues.ts and external-events-fetch-service.ts.
 * Do not include instagram — cron inserts use source "instagram" and must not be swept by refresh.
 */
export const EXTERNAL_EVENTS_FETCH_STALE_SOURCES = [
  "kuckuck",
  "clubhaus",
  "schlachthaus",
  "epplehaus",
  "tuebingen-market",
  "tuebingen-flohmarkt",
  "uni-tuebingen",
  "sudhaus",
  "club-voltaire",
  "dai",
  "partykel",
  "diginights",
  "official-scraper",
] as const;

function redditIngestSources(): string[] {
  return (process.env.EXTERNAL_EVENTS_REDDIT_SUBREDDITS ?? "tuebingen")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0)
    .map((sub) => `reddit-${sub}`);
}

/** Sources whose stale rows are removed after each refresh sync (new scraped_at window). */
export function externalEventsFetchStaleSourceKeys(): string[] {
  return [...EXTERNAL_EVENTS_FETCH_STALE_SOURCES, ...redditIngestSources()];
}
