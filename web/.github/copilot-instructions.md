# Copilot Instructions for WasGehtTüb

Diese Datei ist das verbindliche Regelwerk für KI-generierten Code in diesem Repository.

Nutze zusätzlich `ARCHITECTURE.md` im Repo-Root als ausführliche Referenz. Wenn du nur eine Regel sicher befolgen kannst, dann diese: Lasse niemals rohe Backend- oder Datenbanklogik in die UI bluten.

## Architektur-Grundsatz

Nutze immer diese Schichten:

`UI -> Service oder Server Action -> lib/* oder Route Handler -> Supabase / externe API`

Halte die Trennung strikt ein:

- UI rendert, bindet Formulare und verarbeitet Interaktionen.
- Services kapseln Orchestrierung, Mapping, Client-Requests und typisierte Fehler.
- Server Actions kapseln serverseitige Mutationen und Revalidation.
- `src/lib/*` kapselt rohe Datenzugriffe, Supabase-Clients, Infrastruktur und rohe Typen.

Vermeide jede Abkürzung zwischen UI und Datenquelle.

## Nicht verhandelbare Regeln

Nutze in `.tsx`-Dateien niemals:

- direkte Supabase-Queries oder -Mutationen
- Importe aus `@/lib/data`
- Importe aus `@/lib/supabase/server`
- rohe `fetch(...)`-Requests zu internen oder externen Backends
- rohe Datenbanktypen aus `@/lib/types` als UI-Prop-Typen
- `snake_case`-Feldnamen wie `starts_at`, `host_user_id`, `upvoted_by_me`

Nutze in `.tsx`-Dateien nur:

- View-Models oder DTOs in `camelCase`
- Server Actions
- Client-Services aus `src/services/*`
- UI-Status, Formularlogik und Toasts

## DTO- und Mapping-Regeln

Nutze rohe Datenbankmodelle nur in backendnahen Schichten:

- `src/lib/types.ts`
- `src/lib/data.ts`
- `src/app/actions/*`
- `src/app/api/*`
- `src/services/*` als Eingabe für Mapper

Mappe rohe Daten immer, bevor sie die UI erreichen.

Pflicht:

- Übersetze `snake_case` immer in `camelCase`.
- Nutze explizite Mapper oder View-Model-Funktionen.
- Reiche keine Supabase-Records direkt an UI-Komponenten weiter.

Beispiel:

```ts
// Rohdaten
starts_at
host_user_id
upvoted_by_me

// UI-Modell
startsAt
hostUserId
upvotedByMe
```

Orientiere dich an diesen bestehenden Mustern:

- `src/services/discover/discover-view-model.ts`
- `src/services/requests/requests-page-service.ts`
- `src/services/parties/party-card-view-model.ts`

## Regeln für Pages

Halte `page.tsx`-Dateien dünn.

Nutze Pages nur zum:

- Entgegennehmen von `params` und `searchParams`
- Aufruf eines Page-Services
- Zusammenbau der finalen UI

Vermeide in Pages:

- Supabase-Wissen
- Feld-Mapping
- Fallback-Logik für DB-Schemata
- Geschäftslogik

Nutze Page-Services für Reads, zum Beispiel:

- `src/services/discover/discover-page-service.ts`
- `src/services/requests/requests-page-service.ts`

## Regeln für Server Actions

Nutze Server Actions für serverseitige Mutationen.

Pflicht in Server Actions:

1. Eingaben validieren
2. Backend-Operation ausführen
3. Fehler serverseitig loggen
4. klare Rückgabe oder klaren Action State liefern
5. betroffene Seiten mit `revalidatePath(...)` oder `revalidateTag(...)` invalidieren

Nutze typisierte Rückgaben oder Action-State-Typen, wenn die UI Feedback anzeigen muss.

Orientiere dich an:

- `src/app/actions/parties.ts`
- `src/app/actions/requests.ts`
- `src/app/actions/admin-events.ts`

## Regeln für Client-Services

Kapsle imperative Browser-Requests in `src/services/*`.

Nutze Client-Services für:

- interne API-Requests via `fetch(...)`
- Browser-Supabase-Clients
- andere browserseitige Integrationen

Mappe Fehler in Client-Services auf `ServiceError`.

Nutze:

- `src/services/service-error.ts`
- `asServiceError(...)`

Orientiere dich an:

- `src/services/events/upvotes-service.ts`
- `src/services/location/nominatim-service.ts`

## Error Handling

Schlucke Fehler nicht still.

Pflicht:

- Fange Service-Fehler in der UI sichtbar ab.
- Nutze die globale Toast-Infrastruktur für nutzerrelevante Fehler.
- Nutze `asServiceError(...)`, wenn ein Service Fehler wirft.

Nutze:

- `src/components/ui/toast-provider.tsx`
- `src/services/service-error.ts`

Vermeide leere `catch`-Blöcke. Wenn ein Fehler absichtlich ignoriert wird, dokumentiere kurz den Grund und liefere einen sicheren Fallback.

## Caching und Performance

Nutze `unstable_cache(...)` nur für öffentliche, benutzerunabhängige Daten.

Lege benutzerspezifische Informationen immer außerhalb des Cache-Callbacks.

Vermeide insbesondere:

- `cookies()` innerhalb eines öffentlichen Cache-Callbacks
- `headers()` innerhalb eines öffentlichen Cache-Callbacks
- personalisierte Daten in wiederverwendbaren Cache-Blöcken

Orientiere dich an:

- `src/services/discover/discover-page-service.ts`
- `src/lib/supabase/public-server.ts`

## Ordnerverantwortung

Nutze diese Verantwortlichkeiten:

- `src/app/`: Pages, Layouts, Route Handler, Server Actions
- `src/components/`: UI-Komponenten
- `src/services/`: Orchestrierung, DTO-Mapping, Client-Services, Page-Services
- `src/lib/`: rohe Datenzugriffe, Supabase-Clients, Infrastruktur, rohe Typen
- `supabase/migrations/`: Datenbankschema und RLS

## Import-Richtung

Halte die Abhängigkeitsrichtung ein:

`app/components -> services -> lib -> supabase/externe APIs`

Erlaube nicht:

- `lib` importiert `components`
- UI importiert `lib/data`
- UI importiert `lib/supabase/server`

Bevorzuge:

- Page -> `@/services/...`
- Client Component -> `@/services/...` oder `@/app/actions/...`
- Service -> `@/lib/...`
- Action / Route Handler -> `@/lib/...`

## Definition of Done

Eine Änderung ist nur dann akzeptabel, wenn alle Punkte erfüllt sind:

- Keine `.tsx`-Datei enthält direkte Supabase-Aufrufe.
- Keine `.tsx`-Datei enthält rohe Backend-Feldnamen in `snake_case`.
- Alle UI-Props verwenden `camelCase`.
- Alle `fetch(...)`-Aufrufe liegen in Services, Actions oder Route Handlern.
- Fehler werden sichtbar behandelt.
- Caching trennt öffentlichen und benutzerspezifischen Kontext sauber.

Wenn ein Vorschlag diese Regeln verletzt, generiere keinen schnellen Shortcut. Erzeuge stattdessen den fehlenden Service, Mapper oder Action-Layer.
