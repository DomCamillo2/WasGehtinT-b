# Go-Live Checklist (30–45 Minuten)

Ziel: WasGehtTüb heute live schalten und erste Nutzer sauber onboarden.

## 0) Voraussetzungen (2 Min)

- GitHub Repo ist aktuell gepusht.
- Supabase Projekt läuft mit deinem finalen Schema + Seeds.
- Stripe Konto ist eingerichtet.

## 1) Vercel Deployment (10 Min)

1. Auf https://vercel.com `New Project` wählen.
2. Dein GitHub Repo importieren.
3. **Root Directory auf `web` setzen**.
4. Framework automatisch als Next.js erkennen lassen.
5. Noch nicht deployen, zuerst Env Vars setzen (nächster Schritt).

## 2) Environment Variablen setzen (8 Min)

In Vercel unter **Project Settings → Environment Variables** eintragen:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (vorerst Vercel Preview/Production URL)
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `INTERNAL_ADMIN_EMAILS` (kommagetrennt)
- `EXTERNAL_EVENTS_REFRESH_TOKEN` (optional, aber empfohlen)

Dann ersten Production Deploy starten.

## 3) Supabase Auth + Redirects (5 Min)

In Supabase Dashboard:

- **Authentication → URL Configuration**
- `Site URL`: deine Live-Domain (z. B. `https://wasgehttueb.de`)
- `Redirect URLs`: mindestens
  - `https://<deine-domain>/*`
  - `https://<dein-vercel-projekt>.vercel.app/*` (optional als Fallback)

## 4) Stripe Webhook live schalten (5 Min)

In Stripe Dashboard:

1. Developer → Webhooks → Add endpoint.
2. Endpoint URL: `https://<deine-domain>/api/stripe/webhook`
3. Relevante Events aktivieren (mindestens die, die dein Code verarbeitet).
4. Signing Secret kopieren und als `STRIPE_WEBHOOK_SECRET` in Vercel setzen.
5. Danach in Vercel **Redeploy** auslösen.

## 5) Domain + DNS (5–10 Min)

In Vercel:

1. `Settings → Domains`.
2. Domain verbinden (`wasgehttueb.de` oder Subdomain wie `app.wasgehttueb.de`).
3. DNS Records beim Provider setzen (A/CNAME laut Vercel).
4. Sobald aktiv: `NEXT_PUBLIC_APP_URL` auf die finale URL setzen.
5. Nochmal redeployen.

## 6) Live Smoke Test (5 Min)

Nach Deployment live testen:

- `/` Login/Registrierung mit Uni-Mail
- `/discover` lädt Events + Logos
- `/host` Party erstellen
- `/requests` Request sichtbar
- `/payments/success` erreichbar
- Stripe Test-Webhook kommt in `/host/webhooks` an

## 7) Erste Nutzer (Tag 1, 20–30 Min)

Minimaler Launch-Plan:

1. 3–5 Hosts manuell onboarden (damit Discover nicht leer ist).
2. 1 IG Story + 1 Reel + 1 WhatsApp-Post mit QR auf `/`.
3. CTA: „Nur Uni-Mail, sichere WG-Partys in Tübingen“.
4. Feedback-Link (Google Form oder DM) in Bio/Story.

## 8) Operative Routine (ab morgen)

- Täglich 1x `/host/webhooks` auf fehlgeschlagene Stripe Events prüfen.
- 2x pro Woche Partner-Events prüfen.
- Top-Friktionen aus Userfeedback priorisieren (Signup, Discover, Anfrageflow).

---

## Was ich für dich vorbereitet habe

- Env-Template ergänzt: `EXTERNAL_EVENTS_REFRESH_TOKEN` ist in `.env.example` enthalten.
- Diese Checkliste ist absichtlich in exakter Reihenfolge gehalten, damit du ohne DevOps-Overhead live gehst.
