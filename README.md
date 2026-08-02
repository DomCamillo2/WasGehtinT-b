# WasGehtTüb

Discover what’s on in Tübingen — concerts, clubs, cinema, markets, and campus life.

**Live:** [wasgehttueb.app](https://www.wasgehttueb.app)

## Layout

```
web/                 ← canonical Next.js app (Vercel rootDirectory = web)
  src/app/           routes & API
  src/components/    UI (discover feed, admin, …)
  src/lib/           scrapers, auth, cache, security
  supabase/          migrations
  scripts/           ops helpers (admin user, cron, env sync, …)
  docs/              product notes
.github/workflows/   scheduled external-events refresh
```

There is **no** Next.js app at the repository root — only `web/`.

## Develop

```bash
cd web
cp .env.example .env.local   # fill Supabase + optional image APIs
npm install
npm run dev
```

Admin: `/admin/login` (Supabase Auth; username `admin` maps via env).

## Deploy

Vercel project root is `web/`. From the repo root:

```bash
npx vercel --prod --yes
```

External events refresh via Vercel Cron / GitHub Actions → `/api/external-events/refresh`.
