import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Impressum</h1>
      <p className="mt-2 text-sm text-zinc-600">Angaben gemäß § 5 DDG.</p>

      <section className="mt-6 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">1. Diensteanbieter</h2>
        <p className="text-sm text-zinc-700">Domile UG (haftungsbeschränkt)</p>
        <p className="text-sm text-zinc-700">Graf-Wartenberg-Ring 11</p>
        <p className="text-sm text-zinc-700">84577 Tüßling</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">2. Kontakt</h2>
        <p className="text-sm text-zinc-700">Telefon: +49 (0) 1606969914</p>
        <p className="text-sm text-zinc-700">E-Mail: info@mentor-pro.de</p>
        <p className="text-sm text-zinc-700">Meldestelle Inhalte: info@mentor-pro.de</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">3. Vertretungsberechtigte Person</h2>
        <p className="text-sm text-zinc-700">Leonhard Steiner</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">4. Registereintrag (falls vorhanden)</h2>
        <p className="text-sm text-zinc-700">Handelsregister: HRB 32736</p>
        <p className="text-sm text-zinc-700">Registergericht: Amtsgericht Traunstein</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">5. Verantwortlich für Inhalte</h2>
        <p className="text-sm text-zinc-700">Leonhard Steiner, Graf-Wartenberg-Ring 11, 84577 Tüßling</p>
      </section>

      <p className="mt-6 text-sm text-zinc-600">
        Zurück zur <Link href="/" className="font-medium underline">Startseite</Link>.
      </p>
    </main>
  );
}
