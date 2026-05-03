PROJECT KNOWLEDGE: WasGehtTüb? (Studenten WG-Party Radar)
1. Die Vision (Elevator Pitch)
Eine PWA (Progressive Web App) exklusiv für Studenten in Tübingen. "WasGehtTüb?" verbindet feierwütige Studis mit Gastgebern von WG-Partys.
Besonderheit: Zugang nur für verifizierte Studenten (via Uni-Mail). Gäste können sich einzeln oder als Gruppe bewerben. Die App regelt die Getränke-Umlage automatisch und bietet smarte Features wie eine "Mitbring-Liste".

2. Kern-Features (MVP)
Map- & Listen-Ansicht: User können zwischen einer Live-Map (Mapbox) und einer chronologischen Liste wechseln. Partys können bis zu 7 Tage im Voraus gepostet werden.

Kategorien: Hosts müssen einen Vibe wählen (z.B. "Beerpong", "Vorglühen", "Hausparty", "Chillig").

Das Match-System (inkl. Gruppen): Gäste können sich bewerben und angeben, für wie viele Personen sie anfragen (z.B. "+2 Freunde"). Der Host swipet/klickt auf "Annehmen" oder "Ablehnen".

Die Mitbring-Liste: Der Host kann beim Erstellen angeben, was noch fehlt (z.B. "Eiswürfel", "Pappbecher"). Gäste können bei der Bewerbung auswählen, was sie davon mitbringen.

Mini-Chat: Erst NACH einem erfolgreichen Match öffnet sich ein simpler Chat zwischen Host und Gast (für Fragen wie "Welcher Klingelname?").

Auto-Payment (Getränke-Umlage): Bei Zusage wird das Geld via Stripe eingezogen. Der Gast zahlt die Umlage + eine kleine Service-Gebühr (z.B. 0,50€), damit der Host exakt seinen Wunschbetrag (z.B. 5,00€) abzugsfrei erhält. Der User, der die Anfrage stellt, zahlt für seine ganze Gruppe.

3. Der Tech-Stack
Frontend: Next.js (App Router, React), Tailwind CSS, TypeScript. Mobile-First (Bottom Navigation, Listen/Map-Toggle).

Backend: Supabase (PostgreSQL, Storage für Profilbilder).

Auth: Supabase Auth (Strict: Nur @student.uni-tuebingen.de E-Mails zulassen).

Realtime: Supabase Realtime für den Mini-Chat.

Payments: Stripe Connect.

Maps: Mapbox API.

4. Guardrails für Copilot (WICHTIG!)
Geld-Wording: Nutze ausschließlich "Umlage", "Beitrag" oder "Service-Gebühr". Niemals "Ticket" oder "Kauf".

Sicherheit: Die genaue Adresse ist in der DB geschützt und wird im Frontend nur für Gäste sichtbar, deren Status auf accepted steht.

Architektur: Trenne smarte Logik (Server Actions) und UI-Komponenten sauber. Halte den Chat extrem simpel (nur Text, keine Bilder).