# Scrapers

**Canonical ingest path:** TypeScript scrapers here → `services/events/external-events-fetch-service.ts` → `POST /api/external-events/refresh` → `lib/external-events-cache.ts`.

**Not canonical:** `web/scripts/sync-external-events-to-supabase.mjs` — incomplete fallback for CI only. Prefer the API refresh. Do not add new venues only to the `.mjs` worker.

## Layout

| File | Role |
|---|---|
| `source-fetch.ts` | HTTP helper with timeout; throws `ExternalSourceFetchError` on transport failure |
| `shared.ts` | IDs, ICS/date helpers, JSON-LD collectors shared by venue scrapers |
| `generic-calendar.ts` | JSON-LD / HTML calendar (Uni, Sudhaus, Club Voltaire, DAI) |
| `schlachthaus.ts` | Schlachthaus program |
| `diginights.ts` | Diginights (Tübingen geo filter) |
| `epplehaus.ts` | Epplehaus ICS |
| `markets.ts` | Stadt markets + Flohmarkt |
| `partykel.ts` | Partykel day list |
| `reddit.ts` | Reddit event heuristics (per-subreddit batches) |
| `source-discovery.ts` | Log-only candidate finder (not ingest) |
| `official-venues.ts` | Barrel re-exports for existing imports |

Kuckuck + Clubhaus live in `external-events-fetch-service.ts` (weekly program / FSRVV table).

Instagram is separate: `lib/scrape-events.ts` + `app/api/cron/scrape/route.ts`.

## Rules when adding a venue

1. New file under this folder (or extend an existing venue module).
2. Use `fetchSourceText(source, url)` — never swallow HTTP errors as `[]`.
3. Set `source` to a stable key and add it to `lib/external-event-sources.ts`.
4. Parse datetimes with `parseSchemaOrgDateTime` / `berlinWallTimeToUtc` / `resolveYearlessBerlinDate`.
5. Sanitize titles with `sanitizeExternalEventTitle` (cache write also sanitizes).
6. Attach coords via `tuebingen-venues.ts` when the venue is known.
7. Wire the fetcher into `fetchExternalEventsBundle` via `runSource(...)`.
8. Add/adjust a unit test if you touch date or title parsing.
