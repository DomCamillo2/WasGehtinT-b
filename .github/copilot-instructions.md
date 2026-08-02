# Copilot Instructions for WasGehtTüb

Verbindliche Kurzregeln für KI-Code. Ausführlich: **`web/ARCHITECTURE.md`**. Agent-Karte: Root-**`AGENTS.md`**.

Wenn du nur eine Regel befolgst: Lasse niemals rohe Backend-/DB-Logik in die UI bluten.

## Architektur-Grundsatz

`UI -> Service oder Server Action -> lib/* oder Route Handler -> Supabase / externe API`

- UI rendert und bindet Interaktionen (nur `camelCase` View-Models).
- Services orchestrieren, mappen DTOs, kapseln Client-`fetch`.
- Server Actions: Mutationen + `revalidatePath` / `revalidateTag`.
- `web/src/lib/*`: Datenzugriff, Scrapers, Cache, Auth-Helfer.

Canonical App-Root: **`web/`**.

## Nicht verhandelbare Regeln

In `.tsx` niemals:

- direkte Supabase-Queries
- Importe aus `@/lib/data` oder `@/lib/supabase/server`
- rohe `fetch(...)` zu Backends
- rohe DB-Typen / `snake_case` Props (`starts_at`, …)

In `.tsx` nur: View-Models, Server Actions, Client-Services, UI-State/Toasts.

## Scrapers

- Canonical: `web/src/lib/scrapers/` + `external-events-fetch-service.ts` + `/api/external-events/refresh`
- Nicht primary: `web/scripts/sync-external-events-to-supabase.mjs` (unvollständiger Fallback)
- Transportfehler werfen; Stale-Delete nur für `sourcesSucceeded`

## Definition of Done

- Keine Supabase-/snake_case-Leaks in `.tsx`
- Scraper/Date-Änderungen: `cd web && npm run test && npm run build`
- Docs/AGENTS nicht widersprechen

Wenn ein Shortcut die Regeln bricht, erzeuge den fehlenden Service/Mapper statt des Shortcuts.
