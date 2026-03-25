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
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (z.B. `http://localhost:3000`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_ADMIN_EMAILS` (kommagetrennt, z.B. `a@student.uni-tuebingen.de,b@student.uni-tuebingen.de`)
- `EXTERNAL_EVENTS_REFRESH_TOKEN` (optional, für automatisches Partner-Event-Refresh per Cron)
- `RESEND_API_KEY` (für transaktionale Mails)
- `RESEND_FROM_EMAIL` (z. B. `WasGehtTüb <onboarding@resend.dev>` oder deine verifizierte Domain-Absenderadresse)

4) Datenbank vorbereiten (Supabase SQL Editor)

- Erst dein Schema-SQL ausführen (das ausführliche Schema aus dem Projektkontext/Chat)
- Danach `../supabase/02_seed_and_views.sql` ausführen
- Danach `../supabase/03_webhook_idempotency.sql` ausführen

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

Im Panel `/host/webhooks` können fehlgeschlagene Events manuell per "Retry Event" erneut verarbeitet werden.
Zusätzlich gibt es Status-Filter (`all`, `failed`, `pending`, `processed`) und Suche nach Event-ID/Event-Typ.

## Partner-Events automatisch aktualisieren

- Externe Events (z. B. Kuckuck + Clubhausfeste) werden serverseitig gecacht und automatisch alle 6 Stunden revalidiert.
- Für aktives Pull-Refresh per Scheduler kann optional ein Cronjob den Endpoint aufrufen:

```bash
GET /api/external-events/refresh
Header: x-refresh-token: <EXTERNAL_EVENTS_REFRESH_TOKEN>
```

- Alternativ als Query: `/api/external-events/refresh?token=<EXTERNAL_EVENTS_REFRESH_TOKEN>`

## Hinweise

- Das Projekt liegt bewusst im Unterordner `web`, da der Workspace-Ordnername nicht npm-kompatibel ist.
- Geld-Wording im UI bleibt bei Beitrag/Umlage/Service-Gebühr.
- Exakte Adresse wird nicht im öffentlichen Discover-Flow angezeigt (RLS über DB-Schema).

## Go-Live

Eine konkrete Schritt-für-Schritt Anleitung für den Livegang findest du in `GO_LIVE_CHECKLIST.md`.

## Stripe Webhook lokal testen

1) Stripe CLI installieren und einloggen.

2) Webhooks an Next.js weiterleiten:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3) Das ausgegebene Secret als `STRIPE_WEBHOOK_SECRET` in `.env.local` setzen.
