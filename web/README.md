# WasGehtTüb Web App

Canonical Next.js app for [wasgehttueb.app](https://www.wasgehttueb.app).

Agent / architecture: root `AGENTS.md`, then `ARCHITECTURE.md`.

## Setup

```bash
npm install
cp .env.example .env.local   # fill Supabase + optional keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin: `/admin/login`.

### Database

Apply SQL from **`supabase/migrations/`** (in order) via Supabase SQL editor or CLI.  
Do **not** use old paths like `../supabase/02_*.sql` — those files do not exist.

### Tests

```bash
npm run test
npm run build
```

## External events

- Discover reads **only** from Supabase (`v_external_events_public`).
- Canonical refresh: `POST /api/external-events/refresh` (GH Actions / cron-job.org).
- Instagram: `POST /api/cron/scrape`.
- `npm run external-events:sync` is an **incomplete fallback** — prefer the API.

Vercel Cron is unused on purpose (`vercel.json` → empty `crons`). Details: `ARCHITECTURE.md`.

Needed GitHub secrets: `CRON_SECRET`, Supabase keys, optional `CLUBHAUS_EVENTS_URL` / `APP_BASE_URL`.

## Screens

- `/` — friendly welcome (light/dark), CTAs to Discover + Auth
- `/auth` — Uni-Mail login
- `/discover` — feed, calendar, map
- `/event/[id]` — external event detail
- `/host`, `/requests`, `/chat` — lower priority than Discover/events
- `/admin/login` — admin

## Go-live

See `GO_LIVE_CHECKLIST.md`.
