# Architekturregeln für WasGehtTüb

Dieses Dokument ist ein verbindliches Architektur-Regelwerk für zukünftige Änderungen und KI-generierten Code. Die produktive Next.js-App und dieses versionierte Regelwerk liegen in `web/`. Behandle dieses Dokument als harte System-Constraints, nicht als lose Empfehlung.

## Aktueller Produktfokus

Stand jetzt liegt der Fokus auf der External-Events-Pipeline:

- Events automatisch aus Quellen sammeln
- Events sauber normalisieren und speichern
- Discover- und Event-UI/UX für diesen Flow optimieren

Nicht im aktuellen Prioritäts-Scope sind unreleased Nebenpfade wie Chat und Payments.

Das bedeutet für Refactorings und neue Änderungen:

- Priorisiere Discover, Event-Detailseiten, Scraper, Cache-Sync und Debug-/Prüfpfade für External Events.
- Behandle Architektur-Lecks in Chat-, Payments- oder Request-Flows nur nachrangig, solange sie nicht auf den Event-Flow zurückwirken.
- Vermeide es, Event-bezogene Refactorings mit unreleased Nebenfeatures zu vermischen.

## Zielbild

Nutze durchgängig ein Anti-Corruption-Layer zwischen UI und Datenquelle.

Nutze immer diese Denkweise:

1. Die UI rendert und reagiert auf Interaktionen.
2. Services und Server Actions kapseln Anwendungslogik.
3. `src/lib/*` kapselt rohe Datenzugriffe, Infrastruktur und Low-Level-Helfer.
4. Erst View-Models/DTOs dürfen in die UI gelangen.

Vermeide jede Abkürzung, die rohe Datenbankstrukturen, rohe Fetch-Requests oder Supabase-Clients direkt in `.tsx`-Dateien zieht.

## Architektur-Überblick

Nutze für Reads, Mutations und clientseitige Interaktionen drei klar getrennte Flows.

### Read-Flow für Seiten

Nutze für Seiten immer diesen Pfad:

`Page / Layout -> Page-Service -> lib/data oder weitere Backend-Helfer -> Supabase -> View-Model/DTO -> UI`

Konkretes Projektmuster:

- `web/src/app/discover/page.tsx` ruft `loadDiscoverPageData()` aus `web/src/services/discover/discover-page-service.ts` auf.
- `discover-page-service.ts` orchestriert Datenquellen, Caching und Anreicherung.
- `web/src/services/discover/discover-view-model.ts` mappt rohe `PartyCard`-Daten in `DiscoverEvent`.
- `web/src/components/party/discover-premium.tsx` rendert ausschließlich das UI-freundliche `DiscoverEvent`.

Nutze `*-page-service.ts` für serverseitige Orchestrierung von Reads.

### Mutation-Flow für Formulare

Nutze für Mutationen immer diesen Pfad:

`UI-Formular -> Server Action -> Supabase / Backend-Logik -> Revalidation -> UI-Feedback`

Konkretes Projektmuster:

- `web/src/components/host/create-party-form.tsx` bindet `createPartyAction` aus `web/src/app/actions/parties.ts`.
- `createPartyAction` validiert Eingaben, schreibt in Supabase und ruft anschließend `revalidatePath(...)` auf.
- Die UI zeigt den Rückgabestatus über die globale Toast-Infrastruktur an.

Nutze Server Actions für Mutationen, wenn die Interaktion natürlich an ein Formular oder einen serverseitigen Workflow gekoppelt ist.

### Client-Flow für interaktive Requests

Nutze für imperative Client-Interaktionen immer diesen Pfad:

`Client Component -> Client-Service -> Route Handler oder Browser-Service -> typisierte Antwort / ServiceError -> Toast`

Konkretes Projektmuster:

- `web/src/components/party/discover-premium.tsx` ruft `togglePartyUpvote(...)` aus `web/src/services/events/upvotes-service.ts` auf.
- `upvotes-service.ts` kapselt den HTTP-Call und mappt Fehler auf `ServiceError`.
- Die UI fängt den Fehler via `asServiceError(...)` ab und zeigt ihn mit `showToast(...)`.

Nutze Client-Services für `fetch(...)`, Browser-Supabase-Clients oder andere imperative Browser-APIs. Platziere diese Logik niemals direkt in einer UI-Komponente.

## Anti-Corruption-Layer: Datenfluss und DTOs

Dieser Abschnitt ist nicht optional. Die Trennung zwischen Rohdaten und UI-Modellen ist der Kern der Architektur.

### Grundregel

Nutze rohe Datenbanktypen nur in Backend-nahen Schichten:

- `web/src/lib/types.ts`
- `web/src/lib/data.ts`
- `web/src/services/*` als Eingabetypen für Mapper
- `web/src/app/actions/*`
- `web/src/app/api/*`

Lass rohe Datenbanktypen niemals direkt in die UI bluten.

Das bedeutet konkret:

- Verwende `snake_case` nur in Rohdaten, Datenzugriffen und Mappings.
- Verwende in der UI ausschließlich `camelCase`.
- Mappe rohe Records immer in explizite DTOs oder View-Models, bevor du sie an `.tsx`-Dateien weitergibst.

### Beispiel 1: Discover

In `web/src/lib/types.ts` ist `PartyCard` bewusst roh definiert, zum Beispiel mit Feldern wie:

- `starts_at`
- `host_user_id`
- `upvoted_by_me`

In `web/src/services/discover/discover-view-model.ts` werden diese Felder zwingend in UI-Modelle übersetzt:

```ts
startsAt: party.starts_at,
hostUserId: party.host_user_id ?? null,
upvotedByMe: party.upvoted_by_me === true,
```

Nutze dieses Muster immer.

`web/src/components/party/discover-premium.tsx` darf deshalb mit `startsAt`, `hostUserId` und `upvotedByMe` arbeiten, ohne etwas über Spaltennamen oder Supabase-Schema wissen zu müssen.

### Beispiel 2: Requests

`web/src/services/requests/requests-page-service.ts` mappt rohe View-Zeilen aus `getMyRequests(...)` auf ein UI-Modell:

```ts
id: String(request.party_request_id ?? ""),
partyId: String(request.party_id ?? ""),
startsAt: String(request.starts_at ?? ""),
groupSize: Number(request.group_size ?? 0),
```

`web/src/app/requests/page.tsx` rendert anschließend nur noch:

- `partyId`
- `startsAt`
- `groupSize`
- `requestStatus`

Nutze auch für kleine Seiten diesen Mapping-Schritt. Überspringe ihn niemals mit der Begründung, es seien "nur ein paar Felder".

### Verbindliche DTO-Regeln

Nutze immer einen expliziten Mapper, wenn mindestens eine dieser Bedingungen erfüllt ist:

- Das Datenmodell stammt aus Supabase.
- Das Modell enthält `snake_case`.
- Das Modell enthält Fallback- oder Legacy-Felder.
- Das Modell wird in einer `.tsx`-Datei verwendet.

Vermeide diese Anti-Patterns konsequent:

- `PartyCard` direkt als Prop-Typ in UI-Komponenten
- `Record<string, unknown>` in UI-Komponenten
- `row.starts_at` in `.tsx`
- Datenbankspaltennamen in `src/components/*`
- Datenbankspaltennamen in `src/app/**/page.tsx`

Wenn ein Feld in der UI existiert, gib ihm einen UI-Namen. Wenn ein Feld aus der DB kommt, übersetze es vorher.

## UI-Regeln

Diese Regeln gelten für alle `.tsx`-Dateien in `web/src/app` und `web/src/components`.

### Was UI-Dateien tun dürfen

Nutze UI-Dateien nur für:

- Rendering
- lokale Interaktionszustände
- Formularbindung
- Aufruf von Services
- Aufruf von Server Actions
- Anzeigen von Toasts

### Was UI-Dateien nicht tun dürfen

Nutze in `.tsx`-Dateien niemals:

- direkte Supabase-Queries wie `.from(...).select(...)`
- direkte Supabase-Mutationen wie `.insert(...)`, `.update(...)`, `.delete(...)`
- Importe aus `@/lib/supabase/server`
- Importe aus `@/lib/data`
- rohe Datenbanktypen aus `@/lib/types` als UI-Prop-Typen
- rohe `fetch(...)`-Requests zu Backends oder externen APIs
- Geschäftslogik, die in Services oder Actions gehört

Wenn eine UI-Datei Daten braucht, importiere einen Page-Service.

Wenn eine UI-Datei mutieren muss, binde eine Server Action oder einen Client-Service an.

Wenn eine UI-Datei externe Daten imperativ laden muss, kapsle den Request in `src/services/*`.

### Thin-Page-Regel

Halte `page.tsx`-Dateien dünn.

Nutze sie zum:

- Entgegennehmen von `searchParams` oder `params`
- Aufruf eines Page-Services
- Zusammenbauen der finalen UI

Vermeide in `page.tsx`:

- Feld-Mapping
- SQL-/Supabase-Wissen
- ad-hoc Daten-Normalisierung
- kopierte Business-Regeln

## Error Handling

Nutze Fehlerbehandlung als expliziten Architekturpfad. Schlucke Fehler nicht still.

### Client-Services

Mappe Fehler in Client-Services auf `ServiceError`.

Relevante Referenz:

- `web/src/services/service-error.ts`
- `web/src/services/events/upvotes-service.ts`

Nutze status- oder transportbezogene Fehlercodes wie:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION`
- `NETWORK`
- `UNAVAILABLE`
- `UNKNOWN`

Wirf in Service-Dateien keine unstrukturierten Strings. Nutze `ServiceError`.

### UI-Fehleranzeige

Fange Service-Fehler in der UI immer sichtbar ab.

Nutze dafür:

- `asServiceError(...)` aus `web/src/services/service-error.ts`
- `useToast()` aus `web/src/components/ui/toast-provider.tsx`

Konkretes Projektmuster:

- `discover-premium.tsx` fängt Fehler von `togglePartyUpvote(...)` ab.
- Der Fehler wird mit `asServiceError(...)` normalisiert.
- Die UI zeigt `showToast({ variant: "error", ... })`.

Zeige Nutzerinnen und Nutzern relevante Fehler immer als Toast oder als expliziten UI-Status. Vermeide unsichtbare Fehlerpfade.

### Server Actions

Nutze in Server Actions bevorzugt typisierte Rückgabeobjekte oder Action-State-Typen.

Konkretes Projektmuster:

- `CreatePartyActionState` in `web/src/app/actions/parties.ts`

Nutze für Server Actions diese Reihenfolge:

1. Eingaben validieren
2. Backend-Operation ausführen
3. Fehler serverseitig loggen
4. klare Rückgabe an die UI geben
5. betroffene Pfade mit `revalidatePath(...)` oder Tags invalidieren

Vermeide leere `catch`-Blöcke. Wenn du einen Fehler absichtlich nicht weiterwirfst, dokumentiere im Code kurz den Grund und sorge für einen sicheren Fallback.

## Caching und Performance

Nutze Caching bewusst und nur an stabilen, öffentlichen Grenzen.

### Regeln

Nutze `unstable_cache(...)` nur für Daten, die:

- öffentlich sind
- nicht von Cookies oder Session-Kontext abhängen
- ohne Benutzerkontext wiederverwendbar sind

Konkretes Projektmuster:

- `web/src/services/discover/discover-page-service.ts` cached nur den öffentlichen Discover-Datenblock.
- Dafür wird `getSupabasePublicServerClient()` aus `web/src/lib/supabase/public-server.ts` verwendet.
- Benutzerabhängige Informationen wie Auth-Zustand oder personalisierte Upvote-Markierungen werden außerhalb des Cache-Blocks ermittelt.

Vermeide, `cookies()`, `headers()` oder andere request-spezifische Daten innerhalb eines öffentlich wiederverwendeten Cache-Callbacks zu verwenden.

Nutze nach Mutationen immer gezielte Invalidierung:

- `revalidatePath(...)` für konkrete Seiten
- `revalidateTag(...)` für tag-basierte Caches

Vermeide unnötige Doppelabfragen. Wenn mehrere UI-Bereiche denselben öffentlichen Datenblock brauchen, ziehe die Abfrage in einen zentralen Service und cache sie dort.

## Scraper-Architektur und Cron-Jobs

Nutze für Scraper niemals eine implizite oder verteilte Logik. Halte den Laufweg von Quelle bis UI explizit dokumentiert und strikt getrennt.

### Grundsatz

Unterscheide im Projekt zwei Scraper-Pipelines:

1. Instagram-/Apify-Scraping für venuebezogene Post-Captions
2. Offizielle Venue- und Stadtquellen für kuratierte External Events

Behandle beide Pipelines als Backend-Prozesse. Sie gehören nicht in UI-Komponenten und nicht in allgemeine Frontend-Utilities.

### Pipeline 1: Instagram-/Apify-Scraping

Nutze für Instagram-Scraping diesen Pfad:

`Externer Cronjob (z. B. cron-job.org) oder CI -> /api/cron/scrape -> src/lib/scrape-events.ts -> Apify + Gemini -> Supabase Admin Client -> external_events_cache`

**Vercel Cron wird nicht verwendet** (siehe Abschnitt „Cron-Ausführung“).

Konkrete Projektdateien:

- `web/src/app/api/cron/scrape/route.ts`
- `web/src/lib/scrape-events.ts`

Aktuelle Logik:

- `src/lib/scrape-events.ts` nutzt den Apify-Actor `apify/instagram-profile-scraper`.
- `fetchLatestInstagramPosts(...)` lädt die letzten Posts eines konfigurierten Venue-Accounts.
- `parseEventsFromCaptions(...)` nutzt Gemini, um aus Captions strukturierte Events zu extrahieren.
- `src/app/api/cron/scrape/route.ts` dedupliziert Posts und Eventkandidaten und schreibt mit `getSupabaseAdmin()` nach `external_events_cache`.
- Die gespeicherten Instagram-Events werden mit `source = "instagram"` markiert.

Nutze für diese Pipeline nur serverseitige Secrets und serverseitige Clients.

Relevante Umgebungsvariablen in der aktuellen Implementierung:

- `APIFY_API_TOKEN`
- `GEMINI_API_KEY`
- `CRON_SECRET`
- `INSTAGRAM_SCRAPE_VENUES`
- `INSTAGRAM_SCRAPE_COOLDOWN_MINUTES`
- `INSTAGRAM_MAX_VENUES_PER_RUN`
- `INSTAGRAM_MAX_POSTS_PER_VENUE`

Nutze die Cooldown- und Limit-Variablen, um externe Dienste zu schonen. Umgehe diese Schutzmechanismen nicht in UI-nahen Änderungen.

Wichtige Regel:

Wenn du die Caption-Parsing-Logik änderst, ändere nicht gleichzeitig die Persistenz- und UI-Logik in derselben gedanklichen Abkürzung. Halte Parsing, Dedupe, Persistenz und Anzeige als getrennte Verantwortlichkeiten.

### Pipeline 2: Offizielle Venue- und Stadtquellen

Nutze für kuratierte externe Events diesen Pfad:

`Externer Cronjob oder manueller Trigger -> /api/external-events/refresh -> fetchExternalEvents() -> Scraper-Funktionen -> syncExternalEventsToCache() -> external_events_cache -> Discover`

Konkrete Projektdateien:

- `web/src/app/api/external-events/refresh/route.ts`
- `web/src/app/actions/external-events.ts`
- `web/src/lib/scrapers/official-venues.ts`
- `web/src/lib/external-events-cache.ts`
- `web/scripts/sync-external-events-to-supabase.mjs`

Aktuelle Logik:

- `fetchExternalEventsAction()` bündelt die offiziellen Quellen.
- Ein Teil der Scraperlogik liegt direkt in `src/app/actions/external-events.ts`, zum Beispiel für:
  - Kuckuck
  - Clubhaus / FSRVV
- Weitere offizielle Quellen liegen in `src/lib/scrapers/official-venues.ts`, zum Beispiel für:
  - Schlachthaus
  - Epplehaus
  - Tübinger Märkte
  - Tübinger Flohmärkte
  - Diginights-Fallback
- `syncExternalEventsToCache()` in `src/lib/external-events-cache.ts` schreibt normalisierte Events nach `external_events_cache` (pro Quelle eigener `source`, z. B. `kuckuck`, `clubhaus`, `schlachthaus`, `diginights`; Fallback-Label `official-scraper` nur wenn ein Event keine Quelle setzt).
- Danach werden veraltete und abgelaufene Events bereinigt (pro Lauf nur für Quellen, die im Batch vorkommen; bei leerem Batch kein Stale-Wipe).
- Anschließend wird `/discover` revalidiert.
- `scripts/sync-external-events-to-supabase.mjs` bildet denselben fachlichen Sync als operatives Node-Skript für manuelle oder externe Läufe ab.

Nutze für offizielle Quellen immer normalisierte `PartyCard`-ähnliche Rohdaten im Backend und mappe sie erst später in UI-Modelle.

Wichtige Regel:

Scraper dürfen Rohdaten in `snake_case` erzeugen, wenn sie sich an das Cache- oder DB-Modell anlehnen. Diese Rohstruktur darf trotzdem niemals direkt in die UI gelangen.

### Persistenz-Regeln für Scraper

Nutze `external_events_cache` als technische Persistenzschicht für gescrapte externe Events.

Pflicht:

- Speichere immer `source`.
- Speichere immer `scraped_at`.
- Bereinige stale Rows nach einem erfolgreichen Lauf.
- Bereinige abgelaufene Events anhand von `ends_at`.
- Nutze Admin-Zugriff nur in Backend-Schichten wie Route Handlern, Actions oder dedizierten Sync-Modulen.

Vermeide, Scraperdaten direkt in Discover-Komponenten oder Page-Dateien aufzubereiten.

### Cron-Ausführung

Nutze Cron-Auslöser ausschließlich über definierte Backend-Endpunkte (`Authorization: Bearer $CRON_SECRET` oder konfiguriertes Refresh-Token).

#### Vercel Cron: nicht verwenden

**Vercel Cron wird bewusst nicht genutzt.** Hintergrund: Am gewählten Setup besteht eine relevante **8-Stunden-Leitplanke** (Ausführungs-/Budget-Kontext der Plattform), und Serverless-Route-Handler sind zusätzlich an **kurze Maximal-Laufzeiten** pro Invocation gebunden. Längere oder zuverlässig wiederholte Scrape-Jobs gehören deshalb auf **externe Cronjobs** oder CI, nicht auf Vercel Cron.

`web/vercel.json` bleibt mit **`"crons": []`** — keine produktiven Vercel-Cron-Einträge committen.

#### Empfohlene Scheduler (extern)

1. **cron-job.org** (Standard-Empfehlung für Produktion)  
   - Setup: `web/scripts/setup-cronjob-org.mjs` mit `ENABLE_CRONJOB_ORG_SETUP=true`, `CRON_JOB_API_KEY`, `CRON_SECRET`, `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL`.  
   - Vorgehaltene Jobs (siehe Skript): **External-Refresh** an `/api/external-events/refresh` (Standard: 0, 6, 12, 18 Uhr Europe/Berlin), **Instagram** an `/api/cron/scrape` (Standard: täglich 7:00).  
   - Passe Stunden/Minuten im Skript an, wenn sich Anforderungen ändern.

2. **GitHub Actions** (Alternative)  
   - Workflow: `.github/workflows/external-events-refresh.yml` (Repo-Root).  
   - Kann z. B. `web/scripts/sync-external-events-to-supabase.mjs` oder per `curl` die gleichen API-Routen triggern — konsistent mit Auth-Secrets im Repository halten.

3. **Manuell / andere Worker**  
   - `npm run external-events:sync` bzw. `web/scripts/trigger-external-events-refresh.mjs` für Einmalläufe und Debugging.

Regeln bei Änderungen:

- Ändere Schedule, Auth und Zielroute bewusst zusammen.
- Dokumentiere im Team **eine** klare „aktive“ Scheduler-Strategie (cron-job.org **oder** GitHub Actions als Hauptquelle), um doppelte unkontrollierte Trigger zu vermeiden.
- Vercel Cron nicht als Ersatz einführen, solange die 8h-/Serverless-Rahmenbedingungen der Architektur gelten.

### Debug- und Testpfade

Nutze Debug-Endpunkte nur zum Testen und nicht als dauerhafte Produktionslogik.

Relevante Dateien:

- `web/src/app/api/test-scrape/route.ts`
- `web/src/app/api/debug/external-events/route.ts`
- `web/src/app/debug/external-events/page.tsx`

Nutze diese Pfade zum:

- isolierten Test einzelner Instagram-Venues
- Sichtprüfung des aktuellen External-Events-Outputs
- manuellen Debuggen von Datum, Quelle und Anzeige

Vermeide, produktive UI oder produktive Seitendaten an diese Debugpfade zu koppeln.

## Ordnerstruktur

Nutze die folgende Struktur als verbindliche Verantwortungsverteilung.

```text
/web
  /ARCHITECTURE.md               -> dieses Regelwerk im versionierten App-Repository
  /src
    /app                         -> Next.js App Router: Pages, Layouts, Route Handlers, Server Actions
    /components                  -> reine UI-Komponenten und Interaktionslogik
    /services                    -> Service-Layer, Page-Services, DTO-Mapping, Client-Service-Wrapper
    /lib                         -> Low-Level-Datenzugriff, rohe Typen, Infrastruktur, Helper
      /supabase                  -> getrennte Supabase-Clients für server, browser, admin, public-server
      /scrape-events.ts          -> Instagram-/Apify-/Gemini-Scraping und Caption-Parsing
      /scrapers                  -> externe Datenquellen und Scraper-Logik
  /supabase/migrations           -> Datenbankschema, RLS, SQL-Migrationen
  /scripts                       -> operative Hilfsskripte für Sync, Checks und Migrationen
```

### Verantwortlichkeiten im Detail

Nutze `web/src/app/` für:

- `page.tsx`, `layout.tsx`, `loading.tsx`
- Route Handler unter `api/**/route.ts`
- Server Actions unter `actions/*.ts`

Nutze `web/src/components/` für:

- visuelle Bausteine
- Formulare
- lokale UI-States
- Toast-Ausgabe

Nutze `web/src/services/` für:

- `*-page-service.ts` als Orchestrierungsschicht für Reads
- `*-view-model.ts` als Mapping-Schicht von Rohdaten zu UI-Modellen
- Client-Service-Dateien mit `fetch(...)`
- typisierte Fehler und Response-Mapping

Nutze `web/src/lib/` für:

- Supabase-Client-Erzeugung
- rohe Datenzugriffe auf Views und Tabellen
- rohe Datenmodelle in `snake_case`
- geteilte, UI-neutrale Hilfsfunktionen
- Scraper-Infrastruktur und technische Sync-Logik

Nutze `web/scripts/` für:

- manuelle oder operative Sync-Skripte
- Cron-Setup-Skripte
- Umgebungs- und Deploy-Helfer

## Import- und Abhängigkeitsregeln

Halte die Abhängigkeitsrichtung strikt ein:

`components/app(.tsx) -> services -> lib -> supabase/externe APIs`

Erlaube keine Rückwärtsabhängigkeit von `lib` nach `components`.

Erlaube keine UI-Abhängigkeit direkt auf `lib/data` oder `lib/supabase/server`.

Nutze bevorzugt diese Importmuster:

- Page -> `@/services/...`
- Client Component -> `@/services/...` und `@/app/actions/...`
- Service -> `@/lib/...`
- Action/Route Handler -> `@/lib/...`

## Nicht verhandelbare Regeln für zukünftige KI-Generierung

Befolge bei jeder Änderung diese Checkliste:

1. Entscheide zuerst, ob es ein Read, eine Mutation oder eine imperative Client-Interaktion ist.
2. Lege die Logik in der passenden Schicht ab: Service, Action oder Route Handler.
3. Nutze rohe Datenbanktypen nur in backendnahen Schichten.
4. Mappe `snake_case` immer auf `camelCase`, bevor Daten in die UI gelangen.
5. Nutze in `.tsx` niemals direkte Supabase-Aufrufe oder rohe `fetch(...)`-Requests.
6. Nutze für sichtbare Fehler immer die globale Toast-Infrastruktur oder einen expliziten UI-Status.
7. Nutze `ServiceError` für Client-Service-Fehler und typisierte Rückgabeobjekte für Server Actions.
8. Nutze Caching nur für öffentliche, benutzerunabhängige Daten.
9. Nutze nach Mutationen gezielte Revalidation.
10. Wenn du versucht bist, eine Abkürzung zu nehmen, baue stattdessen einen Mapper oder einen Service.

## Definition of Done für Architekturkonformität

Eine Änderung ist nur dann architekturkonform, wenn alle folgenden Aussagen wahr sind:

- Keine `.tsx`-Datei enthält direkte Supabase-Queries.
- Keine `.tsx`-Datei enthält rohe Backend-Feldnamen wie `starts_at`.
- Alle UI-Props verwenden `camelCase`.
- Alle Fetches liegen in Services, Actions oder Route Handlern.
- Fehler werden sichtbar behandelt und nicht still geschluckt.
- Caching respektiert die Trennung zwischen öffentlichem und benutzerspezifischem Kontext.

Wenn auch nur eine dieser Aussagen falsch ist, ist die Änderung nicht sauber abgeschlossen.
