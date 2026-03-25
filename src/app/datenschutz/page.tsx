import Link from "next/link";

export default function DatenschutzPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Datenschutzerklärung</h1>
      <p className="mt-2 text-sm text-zinc-600">
        DSGVO-Informationsseite für WasGehtTüb (Art. 13 DSGVO). Bitte alle Platzhalter durch echte Angaben ersetzen und final rechtlich prüfen lassen.
      </p>

      <section className="mt-6 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">1. Verantwortlicher</h2>
        <p className="text-sm text-zinc-700">[Name/Firma, Anschrift, E-Mail]</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">2. Verarbeitete Daten</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
          <li>Accountdaten (Uni-E-Mail, Anzeigename, Auth-ID)</li>
          <li>Party- und Anfrage-Daten (Titel, Beschreibung, Gruppengröße, Nachrichten)</li>
          <li>Standortdaten (grob für Discover, ggf. manuell gesetzter Pin)</li>
          <li>Technische Server- und Sicherheitslogs</li>
        </ul>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">3. Zwecke und Rechtsgrundlagen</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
          <li>Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) für Kernfunktionen der Plattform</li>
          <li>Rechtliche Pflichten (Art. 6 Abs. 1 lit. c DSGVO), soweit einschlägig</li>
          <li>Berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO), z. B. Systemsicherheit</li>
        </ul>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">4. Empfänger / Auftragsverarbeiter</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
          <li>Supabase (Datenbank/Auth)</li>
          <li>Vercel (Hosting)</li>
          <li>Resend (Transaktionsmails)</li>
          <li>Stripe (Zahlungsabwicklung, falls aktiviert)</li>
        </ul>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">5. Speicherdauer</h2>
        <p className="text-sm text-zinc-700">
          Daten werden nur so lange gespeichert, wie es für die genannten Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen.
        </p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">6. Betroffenenrechte</h2>
        <p className="text-sm text-zinc-700">
          Du hast Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie ein Beschwerderecht bei einer Aufsichtsbehörde.
        </p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">7. Pflicht zur Bereitstellung von Daten</h2>
        <p className="text-sm text-zinc-700">
          Bestimmte Daten (z. B. E-Mail und Login-Daten) sind für die Nutzung der Plattform erforderlich. Ohne diese Daten kann kein Account bereitgestellt werden.
        </p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">8. Sicherheit der Verarbeitung</h2>
        <p className="text-sm text-zinc-700">
          Wir setzen technische und organisatorische Maßnahmen ein, um deine Daten zu schützen (z. B. Zugriffsbeschränkungen, Transportverschlüsselung, Sicherheits-Header).
        </p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">9. Kontakt für Datenschutzanfragen</h2>
        <p className="text-sm text-zinc-700">E-Mail: [datenschutz@example.com]</p>
        <p className="text-sm text-zinc-700">Alternativ: Kontaktdaten im Impressum</p>
      </section>

      <p className="mt-6 text-sm text-zinc-600">
        Zurück zur <Link href="/" className="font-medium underline">Startseite</Link>.
      </p>
    </main>
  );
}
