import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Impressum</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Angaben gemäß § 5 DDG. Bitte die Platzhalter durch deine echten Daten ersetzen.
      </p>

      <section className="mt-6 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Diensteanbieter</h2>
        <p className="text-sm text-zinc-700">[Vor- und Nachname / Firma]</p>
        <p className="text-sm text-zinc-700">[Straße, Hausnummer]</p>
        <p className="text-sm text-zinc-700">[PLZ, Ort]</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Kontakt</h2>
        <p className="text-sm text-zinc-700">E-Mail: [kontakt@example.com]</p>
        <p className="text-sm text-zinc-700">Telefon: [optional]</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Verantwortlich für Inhalte</h2>
        <p className="text-sm text-zinc-700">[Name, Anschrift wie oben]</p>
      </section>

      <p className="mt-6 text-sm text-zinc-600">
        Zurück zur <Link href="/" className="font-medium underline">Startseite</Link>.
      </p>
    </main>
  );
}
