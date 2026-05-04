# Review: Discover UI v2 (`/discover?ui=new`)

Stand: 2026-05-03. Fokus: Korrektheit, Konsistenz mit Serverdaten, A11y, Copy.

## Stärken

- Klare Trennung: Server liefert gefilterte Listen (u. a. `liked=1` nur mit Session), Client übernimmt Suche und Kategorie ohne zweites „Fake“-Backend.
- URL-Sync für `ui`, `type`, `date` (Kalender) und `weeks` ist nachvollziehbar und teilbar.
- Kartenansicht nutzt nur Events mit Koordinaten; leerer Zustand ist erklärt.
- Hot-Banner und Interessierten-Zahlen können auf echten Upvotes basieren (nach Entfernen lokaler Count-Aufblähung, siehe Fixes).

## Behobene / adressierte Implementierungsfehler

1. **`liked=1` ohne Login**  
   Der Server ignoriert `liked` ohne User (`discover-page-service`), liefert also die **volle** Liste, während die UI „Gespeichert“ aktiv zeigte.  
   **Fix:** Beim ersten Client-Render `liked` aus der URL entfernen und kurz informieren.

2. **Kalender-Monat vs. URL-Datum**  
   Bei Änderung von `?date=` wurde nur `calendarDate` gesetzt, nicht `calendarMonth` — der Raster-Monat konnte vom ausgewählten Tag abweichen.  
   **Fix:** Bei gültigem `date`-Parameter auch `calendarMonth` setzen.

3. **Lokale Upvote-Counts aus LocalStorage**  
   Für in LocalStorage gemerkte IDs wurde der angezeigte Count künstlich auf mindestens `1` gesetzt, obwohl der Server `0` meldet — wirkte wie zusätzliche „Teilnahme“ und verfälschte Trend/Hot-Logik.  
   **Fix:** LocalStorage nur noch für die Merkliste (`upvotedPartyIds`), nicht für `upvoteCounts`.

4. **Irreführende Empty-State-Copy**  
   Text verwies auf „klassische Ansicht für Karte und Kalender“, obwohl v2 Karte und Kalender bereits hat.  
   **Fix:** Text an reale Aktionen (Filter zurücksetzen, Suche, andere Kategorie) angepasst.

5. **Falsches `aria-label` am „Slider“-Link**  
   Bezeichnete „Karte, Kalender und weitere Filter“, verlinkt aber auf die **klassische** Discover-Ansicht.  
   **Fix:** Label an tatsächliche Zielaktion angepasst.

## Verbesserungsvorschläge (nicht umgesetzt)

- **Epplehaus & weitere Venues:** Partner-Logos ergänzen (`public/logos/venues/`, Matcher in `discover-venue-visual.ts` / Map), damit Karten und Karten visuell konsistent sind.
- **„Mehr Wochen laden“:** UX prüfen, ob ein kurzer Hinweis „lädt neue Daten vom Server“ sinnvoll ist (Remount über `key={currentWeeks}`).
- **Bottom-Navigation:** Links zu `/spontan` und Profil verlassen `ui=new` — ggf. `ui=new` optional mitschleifen, wenn ihr ein durchgängiges v2-Erlebnis wollt.
- **E2E-Tests:** Kurze Tests für `liked` + Gast, Kalender-URL und Filter-Reset.

## Kurzfassung

Die v2-Oberfläche ist strukturiert und erweiterbar; die wichtigsten Bugs lagen bei **Gast + `liked`**, **Kalender-Monatssync** und **künstlichen Upvote-Zahlen** sowie bei **Copy/A11y** — diese Punkte sind im Code bereinigt.
