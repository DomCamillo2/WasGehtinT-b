# Full audit — WasGehtTüb (2026-08-02)

Scope: production app in `web/`. Anti-slop guidance from GitHub [Hallmark](https://github.com/apsolut-discovery/hallmark) + [no-slop-ui](https://github.com/LeoStehlik/no-slop-ui) (Notion MCP unavailable in this cloud environment).

## Runtime / health

| Check | Result |
|---|---|
| Production root | `web/` (README + ARCHITECTURE) |
| Legacy duplicate tree | Repo root `src/` + `scripts/` still present — easy to edit the wrong tree |
| `.env.local` in agent workspace | Missing (expected) — scrapers/DB live checks need secrets |
| Discover reads | Cache-only via `v_external_events_public` — correct |
| Vercel crons | Empty by design — GH Actions / cron-job.org |

## Scraper / data — findings & fixes in this PR

### Fixed

1. **GH Actions used outdated root worker** → workflow now runs `web/` `npm run external-events:sync` (per-source keys + empty-batch safety).
2. **Refresh cooldown keyed on dead `official-scraper` source** → uses `externalEventsFetchStaleSourceKeys()`.
3. **Hardcoded `+02:00` / `Date.UTC` wall times** in `official-venues.ts` → `berlinWallTimeToUtc` (+ better ICS UTC/date-only).
4. **Instagram date→post matching used US `MM.DD`** → German `D.M` / `DD.MM` + title fallback.
5. **Clubhaus URL hardcoded season path** → `CLUBHAUS_EVENTS_URL` env override.
6. **Missing dedupe columns** → migration `20260802120000_external_events_cache_dedupe_columns.sql`.
7. **Reddit subreddit default mismatch** → aligned to `tuebingen,reutlingen,stuttgart`.
8. **`.env.example` incomplete** → Apify/Gemini/Diginights/Instagram/Clubhaus knobs documented.

### Still open (not blocking this PR)

- Root `scripts/sync-external-events-to-supabase.mjs` remains a legacy trap if someone runs it manually.
- `enrichExternalEventCategories` / source-discovery still largely unwired.
- Apply new migration on Supabase before relying on `external_id` / `source_url` dedupe.
- Dual codebase (`/` vs `web/`) should eventually be collapsed.

## UI anti-slop refresh

Direction: **Neckar Night** — cool ink `#0e1110`, muted Neckar green brand, one copper signal `#d48745`. Fonts: **Figtree** + **Bricolage** wordmark (Inter removed).

Removed / reduced: purple–fuchsia SaaS tokens, glass blur chrome, floating blob field, glow/pulse CTAs, noise overlay, English “Coming soon / Stay tuned” on primary surfaces, weak brand caption in discover header.

Primary surfaces touched: tokens (`globals.css`, `tailwind.config.ts`), auth splash, discover experience/feed/cards/nav/calendar, shared primary buttons, bottom-nav accents.

## Live verification (2026-08-02, Vercel env pull)

- Linked Vercel project `was-gehtin-t-b`, pulled development + selected production secrets into `.env.local` (gitignored).
- Supabase REST connection test: **passed** (`v_external_events_public` readable).
- Applied migration `20260802120000_external_events_cache_dedupe_columns.sql` → columns `external_id`, `source_url` present.
- Worker sync: **18 upserted** (Diginights city URLs were 404; root `diginights.com` returns 200 — defaults updated).
- API refresh (`/api/external-events/refresh` with `CRON_SECRET`): **ok, count=18, upserted=18**.
- Dev smoke: `/`, `/discover`, `/auth` → 200; auth shows Neckar Night copy (`Was geht heut’`, copper accent).
- Supabase MCP not used (cloud agent cannot complete plugin OAuth); Postgres via Vercel URL used instead.

### Cache snapshot after sync

| source | notes |
|---|---|
| kuckuck / schlachthaus / markets | refreshed same day |
| club-voltaire | stale (May) — not in GH worker set |
| instagram | stale (Apr) — needs separate cron scrape |
| diginights | previously failing on `/city/tuebingen` 404 |


## Full implementation pass (2026-08-02 #2)

### Done in code
- GH Actions: primary path is production `POST /api/external-events/refresh` (full scraper set); worker is failure fallback; Instagram cron job added.
- Worker Berlin `+02:00` removed; ICS UTC/date-only supported.
- `enrichExternalEventCategories` wired into `fetchExternalEvents` (env `EXTERNAL_EVENTS_ENRICH_CATEGORIES`).
- Apify/Gemini secret trailing `\\n` stripping in `scrape-events.ts`.
- Instagram insert falls back if category columns missing; live DB now has extended + dedupe columns; public view recreated.
- Dead classic UI removed: `discover-premium`, `EventCard`, `Navbar`.
- Purple leftovers restyled on requests/host/map/create-party/status-ui/admin.
- German copy replaces “Stay tuned”.
- Docs: GO_LIVE, DISCOVER review, ARCHITECTURE, root `.env.example` pointer.

### Ops still on you
- Add GitHub secrets: `CRON_SECRET`, optional `APP_BASE_URL`, `CLUBHAUS_EVENTS_URL`.
- Re-save Apify/Gemini in Vercel without trailing newlines (local `.env.local` already cleaned).
- Some Instagram handles 404 / blocked by Instagram — expected flaky.
