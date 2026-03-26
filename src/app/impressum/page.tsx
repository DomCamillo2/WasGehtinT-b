import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Impressum</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Angaben gemäß § 5 DDG. Diese Vorlage ist professionell strukturiert, aber du musst alle Platzhalter mit deinen echten Daten ersetzen.
      </p>

      <section className="mt-6 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">1. Diensteanbieter</h2>
        <p className="text-sm text-zinc-700">[Vor- und Nachname / Firma]</p>
        <p className="text-sm text-zinc-700">[Rechtsform, falls zutreffend]</p>
        <p className="text-sm text-zinc-700">[Straße, Hausnummer]</p>
        <p className="text-sm text-zinc-700">[PLZ, Ort]</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">2. Kontakt</h2>
        <p className="text-sm text-zinc-700">E-Mail: [kontakt@example.com]</p>
        <p className="text-sm text-zinc-700">Telefon: [verpflichtend eintragen]</p>
        <p className="text-sm text-zinc-700">Meldestelle Inhalte: [abuse@example.com]</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">3. Vertretungsberechtigte Person</h2>
        <p className="text-sm text-zinc-700">[Name der vertretungsberechtigten Person, falls erforderlich]</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">4. Registereintrag (falls vorhanden)</h2>
        <p className="text-sm text-zinc-700">[Handelsregister / Vereinsregister]</p>
        <p className="text-sm text-zinc-700">[Registernummer]</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">5. Umsatzsteuer-ID (falls vorhanden)</h2>
        <p className="text-sm text-zinc-700">[USt-IdNr. gemäß § 27a UStG]</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">6. Verantwortlich für Inhalte</h2>
        <p className="text-sm text-zinc-700">[Name, Anschrift wie oben]</p>
      </section>

      <p className="mt-6 text-sm text-zinc-600">
        Zurück zur <Link href="/" className="font-medium underline">Startseite</Link>.
      </p>
    </main>
  );
}
