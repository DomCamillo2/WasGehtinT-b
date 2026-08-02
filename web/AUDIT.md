# Full audit — WasGehtTüb (updated 2026-08-02)

Scope: production app in `web/` only. Agent map: root `AGENTS.md`.

## Runtime / health

| Check | Result |
|---|---|
| Production root | `web/` (Vercel `rootDirectory`) |
| Legacy duplicate tree | **Removed** — do not recreate a Next app at repo root |
| Discover reads | Cache-only via `v_external_events_public` |
| Vercel crons | Empty by design — GH Actions / cron-job.org |
| Canonical refresh | `POST /api/external-events/refresh` (full TS scraper set) |
| Worker script | `web/scripts/sync-external-events-to-supabase.mjs` — **fallback only**, incomplete |

## Scraper reliability (current)

- Per-source success tracking; failed sources keep last good rows
- HTTP/timeouts throw via `fetchSourceText` (25s)
- Berlin-aware JSON-LD datetimes + event IDs
- Title sanitize at cache write + Discover/detail display
- Scrapers split under `web/src/lib/scrapers/` (see README there)

## UI direction

**Neckar Night** — cool ink `#0e1110`, muted Neckar green brand, copper signal `#c4783a` (CSS source of truth). Fonts: **Figtree** + **Bricolage**. Avoid purple SaaS defaults / glass blur / glow CTAs.

UI/UX audit: `web/docs/UI_UX_AUDIT.md` (score 6.5/10 — Welcome/Discover strong; secondary IA/theme debt).

## Ops still on you

- GitHub secrets: `CRON_SECRET`, optional `APP_BASE_URL`, `CLUBHAUS_EVENTS_URL` (update each semester)
- Apify/Gemini for Instagram without trailing newlines
- Some Instagram handles 404 / blocked — expected flaky
