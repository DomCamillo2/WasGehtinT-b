<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# WasGehtTüb — Agent map

Canonical app: **`web/`** (Vercel `rootDirectory`). There is **no** Next.js app at the repo root.

Read next (in order):

1. This file
2. `web/ARCHITECTURE.md` (hard layering rules)
3. `web/.env.example` for env knobs

Ignore stale notes in older docs if they conflict with this map.

## Product focus

Priority: **Discover + external events pipeline** (scrape → cache → Discover/event UI).

Deprioritize: chat, payments, requests — unless the change touches shared auth/data.

Brand / UI direction: cool ink + muted Neckar green + copper accent (`#d48745`). Fonts: Figtree + Bricolage. Avoid purple SaaS defaults, glass blur, glow CTAs.

## Start here by task

| Task | Entry points |
|---|---|
| Discover page | `web/src/app/discover/page.tsx` → `services/discover/discover-page-service.ts` → `components/discover/discover-experience-v2.tsx` |
| Discover cards / feed | `web/src/components/discover/discover-feed-v2.tsx`, `discover-event-card-v2.tsx` |
| Event DTO mapping | `web/src/services/discover/discover-view-model.ts` (snake_case → camelCase) |
| Event detail page | `web/src/services/events/external-event-page-service.ts` |
| Official scrapers | `web/src/lib/scrapers/` (see `README.md` there). Orchestration: `services/events/external-events-fetch-service.ts` |
| Cache sync / stale wipe | `web/src/lib/external-events-cache.ts` — pass `sourcesSucceeded` |
| Refresh cron API | `web/src/app/api/external-events/refresh/route.ts` |
| Instagram cron | `web/src/app/api/cron/scrape/route.ts` + `lib/scrape-events.ts` |
| Titles like `next://…` | `web/src/lib/sanitize-event-title.ts` (also applied at cache write) |
| Berlin dates | `web/src/lib/timezone-berlin.ts` (`berlinWallTimeToUtc`, `parseSchemaOrgDateTime`) |
| Venue coords / map | `web/src/lib/tuebingen-venues.ts`, `components/party/discover-map.tsx` |
| Auth / admin | `web/src/app/actions/auth.ts`, `lib/admin-guard.ts`, `lib/cron-auth.ts` |
| DB migrations | `web/supabase/migrations/` only |

## Do

- Keep pages thin: Page → `*-page-service` → lib → DTO → UI
- UI (`.tsx`) gets **camelCase** view-models only — never `starts_at` / raw Supabase
- Put scrapers under `web/src/lib/scrapers/`; throw on HTTP/timeout (do not return `[]` for transport failures)
- Stale-delete **only** sources listed in `sourcesSucceeded`
- Prefer `POST /api/external-events/refresh` (full scraper set) over the Node worker script
- Run `cd web && npm run test` and `npm run build` before considering scraper/date work done

## Do not

- Edit or recreate a Next app at the **repo root**
- Use `web/scripts/sync-external-events-to-supabase.mjs` as the primary ingest path (incomplete fallback only)
- Wipe all sources when one venue fails
- Put Supabase / `lib/data` imports in UI components
- Invent far-future events via year-bump without `maxFutureMs` guards
- Remount Discover feed on `currentWeeks` (breaks scroll / load-more)

## Architecture cheat sheet

```
UI (.tsx)
  → services/* (page services, view-models, client services)
    → lib/* (data, scrapers, cache, auth helpers)
      → Supabase / external HTTP
```

External events:

```
GH Actions / cron
  → /api/external-events/refresh
    → fetchExternalEventsBundle()
      → scrapers (per source ok/fail)
        → syncExternalEventsToCache(events, { sourcesSucceeded })
          → external_events_cache
            → v_external_events_public
              → Discover
```

## Tests

```bash
cd web && npm run test
```

High-value coverage: title sanitize, Berlin datetime parse, event ID day keys. Add tests next to pure helpers under `web/src/**/*.test.ts`.

## Ops notes agents should not forget

- Set `CLUBHAUS_EVENTS_URL` each semester (seasonal page)
- Secrets: `CRON_SECRET`, Supabase keys, optional Apify/Gemini for Instagram
- Vercel `crons` is intentionally empty — freshness is external cron / GH Actions
