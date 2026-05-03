Projekt-Architektur & KI-Regeln
Du agierst in diesem Projekt als Senior Software Architekt. Halte dich bei jeder Code-Generierung oder jedem Refactoring strikt an die folgenden Architektur-Vorgaben:

1. Strict Separation of Concerns (Frontend vs. Backend)

UI-Komponenten (React/Next.js) dürfen niemals direkt mit der Datenbank (Supabase) kommunizieren oder direkte Fetch-Requests ausführen.

UI-Komponenten sind "dumm" und kümmern sich nur um Rendering, State-Management und Error-Handling für den User.

2. Service-Layer-Pattern

Sämtliche Datenbank-Logik, API-Aufrufe (z.B. Supabase, Nominatim) und Daten-Transformationen MÜSSEN in isolierten Service-Dateien (unter src/services/) liegen.

Das Frontend ruft ausschließlich diese Service-Funktionen (z.B. toggleUpvote()) auf.

In der UI dürfen keine datenbankspezifischen Begriffe (wie direkte Tabellenspalten-Namen) auftauchen. Die Services mappen diese auf saubere Frontend-Typen.

3. Admin-Bereich ist isoliert

Der Admin-Bereich und dessen Logik sind streng von der User-Facing-App getrennt. Admin-Datenabfragen liegen in eigenen Admin-Services.

4. Vorgehensweise bei Änderungen

Wenn du neuen Code schreibst, baue zuerst den Service/die Backend-Logik und erst danach die UI-Komponente, die diesen Service konsumiert.

Arbeite in kleinen, testbaren "Baby-Steps".
