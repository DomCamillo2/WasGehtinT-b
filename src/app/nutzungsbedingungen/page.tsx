import Link from "next/link";

export default function NutzungsbedingungenPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">AGB & Nutzungsbedingungen</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Gültige Bedingungen für die Nutzung von WasGehtTüb.
      </p>

      <section className="mt-6 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">1. Rolle der Plattform</h2>
        <p className="text-sm text-zinc-700">
          WasGehtTüb stellt ausschließlich eine Vermittlungsplattform zur Verfügung. Verträge über Teilnahme an Partys kommen ausschließlich zwischen Host und Gast zustande.
        </p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">2. Haftung</h2>
        <p className="text-sm text-zinc-700">
          WasGehtTüb ist nicht Veranstalter der Parties und haftet nicht für Schäden, Verletzungen oder Sachschäden im Zusammenhang mit Veranstaltungen von Hosts, außer bei Vorsatz oder grober Fahrlässigkeit im gesetzlichen Rahmen.
        </p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">3. Zulässige Nutzung / private Hosts</h2>
        <p className="text-sm text-zinc-700">
          Die Plattform ist für private, nicht-gewerbliche Veranstaltungen gedacht. Gewerbliche Nutzung, systematische Gewinnerzielung oder steuer-/erlaubnispflichtige Tätigkeiten sind ohne ausdrückliche Freigabe untersagt.
        </p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">4. Inhalte, Chat und Meldungen</h2>
        <p className="text-sm text-zinc-700">
          Illegale Inhalte (z. B. Beleidigungen, Gewaltaufrufe, Diskriminierung, strafbare Inhalte) sind verboten. Inhalte können über „Beitrag melden“ gemeldet werden und werden nach Prüfung entfernt.
        </p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">5. Sanktionen</h2>
        <p className="text-sm text-zinc-700">
          Bei Verstößen können Inhalte gelöscht, Accounts eingeschränkt oder gesperrt werden.
        </p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">6. Kontakt für Meldungen</h2>
        <p className="text-sm text-zinc-700">Domile UG (haftungsbeschränkt)</p>
        <p className="text-sm text-zinc-700">Graf-Wartenberg-Ring 11, 84577 Tüßling</p>
        <p className="text-sm text-zinc-700">Telefon: +49 (0) 1606969914</p>
        <p className="text-sm text-zinc-700">E-Mail: info@mentor-pro.de</p>
      </section>

      <p className="mt-6 text-sm text-zinc-600">
        Weitere Pflichtseiten: <Link href="/impressum" className="underline">Impressum</Link> ·{" "}
        <Link href="/datenschutz" className="underline">Datenschutz</Link>
      </p>
    </main>
  );
}
