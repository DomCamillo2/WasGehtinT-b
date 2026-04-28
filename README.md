# WasGehtTüb Web App (MVP)

Mobile-first PWA-ähnliches Frontend für den Studenten WG-Party Radar.

## Tech

- Next.js (App Router, TypeScript, Tailwind)
- Supabase (Auth + Postgres + Realtime)
- MapLibre GL + OpenFreeMap (Map-Ansicht, ohne Token)

## Setup

1) Abhängigkeiten installieren

```bash
npm install
```

2) Environment-Datei anlegen

```bash
cp .env.example .env.local
```

3) Variablen in `.env.local` setzen

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (oder fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `NEXT_PUBLIC_APP_URL` (z.B. `http://localhost:3000`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SECRET_KEY` (oder fallback `SUPABASE_SERVICE_ROLE_KEY`)
- `INTERNAL_ADMIN_EMAILS` (kommagetrennt, z.B. `a@student.uni-tuebingen.de,b@student.uni-tuebingen.de`)
- `EXTERNAL_EVENTS_REFRESH_TOKEN` (optional, für automatisches Partner-Event-Refresh per Cron)
- `CRON_SECRET` (für sichere Vercel-Cron-Aufrufe auf interne API-Routen)
- `RESEND_API_KEY` (für transaktionale Mails)
- `RESEND_FROM_EMAIL` (z. B. `WasGehtTüb <onboarding@resend.dev>` oder deine verifizierte Domain-Absenderadresse)

4) Datenbank vorbereiten (Supabase SQL Editor)

- Erst dein Schema-SQL ausführen (das ausführliche Schema aus dem Projektkontext/Chat)
- Danach `../supabase/02_seed_and_views.sql` ausführen
- Danach `../supabase/03_webhook_idempotency.sql` ausführen
- Danach `../supabase/04_external_partner_events.sql` ausführen
- Danach `../supabase/05_hangouts.sql` ausführen
- Danach `../supabase/06_content_reports.sql` ausführen
- Danach `../supabase/07_user_profile_onboarding.sql` ausführen
- Danach `./supabase/08_external_events_cache.sql` ausführen

5) Dev-Server starten

```bash
npm run dev
```

Öffnen: [http://localhost:3000](http://localhost:3000)

Falls Supabase-Variablen fehlen, zeigt die Startseite eine Setup-Anleitung statt eines Runtime-Errors.

## MVP Screens

- `/` Login/Registrierung (nur Uni-Mail im Server-Flow erlaubt)
- `/discover` Listen- oder Map-Ansicht, Gruppenanfrage + Mitbring-Auswahl
- `/host` Party erstellen, offene Anfragen annehmen/ablehnen
- `/requests` Eigene Anfragen inkl. Status
- `/chat` Mini-Chat nach akzeptierter Anfrage (Realtime-Updates)
- `/payments/success` Rückkehrseite nach Stripe Checkout
- `/party/[partyId]/address` Exakte Adresse (nur Host oder accepted Gast)
- `/host/webhooks` Internes Admin-Panel für Stripe Webhook Events
- `/host/reports` Interne Moderations-Queue für gemeldete Inhalte

Im Panel `/host/webhooks` können fehlgeschlagene Events manuell per "Retry Event" erneut verarbeitet werden.
Zusätzlich gibt es Status-Filter (`all`, `failed`, `pending`, `processed`) und Suche nach Event-ID/Event-Typ.

## Partner-Events automatisch aktualisieren

Externe Events sind jetzt sauber vom Frontend getrennt:

- Frontend liest nur aus Supabase (`v_external_events_public`).
- Background-Worker scraped Quellen und schreibt direkt in `external_events_cache`.
- Der Worker laeuft in GitHub Actions (`.github/workflows/external-events-refresh.yml`).
- Das ist die aktive Source-of-Truth fuer Scheduling in Produktion.
- `vercel.json` enthaelt bewusst keine aktiven Cronjobs.
- `scripts/setup-cronjob-org.mjs` ist nur ein optionaler Fallback und standardmaessig nicht aktiv.

Benötigte GitHub Repository Secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (oder fallback `SUPABASE_SERVICE_ROLE_KEY`)
- `DIGINIGHTS_URLS` (optional, kommaseparierte Fallback-URLs)

Lokal testen:

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run external-events:sync
```

Optionaler Diginights-Override (z. B. bei URL-Aenderungen):

```bash
DIGINIGHTS_URLS="https://diginights.com,https://diginights.com/city/tuebingen" npm run external-events:sync
```

## Reports API

Serverseitige API für Meldungen und Moderation:

```bash
POST /api/reports
Content-Type: application/json
Body: { "type": "chat|spontan|party|other", "targetId": "...", "reason": "...", "details": "..." }
```

- Benötigt eingeloggten User (Session Cookie).

```bash
GET /api/reports?status=open&limit=100
```

- Nur interne Admins (`INTERNAL_ADMIN_EMAILS`).

```bash
PATCH /api/reports/{reportId}
Content-Type: application/json
Body: { "status": "open|reviewing|resolved|rejected", "reviewNote": "..." }
```

- Nur interne Admins (`INTERNAL_ADMIN_EMAILS`).

## Hinweise

- Das Projekt liegt bewusst im Unterordner `web`, da der Workspace-Ordnername nicht npm-kompatibel ist.
- Geld-Wording im UI bleibt bei Beitrag/Umlage/Service-Gebühr.
- Exakte Adresse wird nicht im öffentlichen Discover-Flow angezeigt (RLS über DB-Schema).

## Go-Live

Eine konkrete Schritt-für-Schritt Anleitung für den Livegang findest du in `GO_LIVE_CHECKLIST.md`.

## Resend Templates einrichten

Für Welcome-, Passwort-Reset- und Verifizierungs-Templates ist ein Setup-Script enthalten:

```bash
node scripts/setup-resend-templates.mjs
```

Verwendete Template-Aliase:

- `wasgehttueb-welcome`
- `wasgehttueb-password-reset`
- `wasgehttueb-email-confirmation`

Optional überschreibbar über Env:

- `RESEND_TEMPLATE_WELCOME`
- `RESEND_TEMPLATE_PASSWORD_RESET`
- `RESEND_TEMPLATE_EMAIL_CONFIRMATION`

## Stripe Webhook lokal testen

1) Stripe CLI installieren und einloggen.

2) Webhooks an Next.js weiterleiten:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3) Das ausgegebene Secret als `STRIPE_WEBHOOK_SECRET` in `.env.local` setzen.
