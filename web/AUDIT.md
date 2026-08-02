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

## Verify locally

```bash
cd web
cp .env.example .env.local   # fill secrets
npm run lint
npm run build
npm run external-events:sync # needs Supabase admin key
```
