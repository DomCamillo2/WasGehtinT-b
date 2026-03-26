import Link from "next/link";
import { ReportForm } from "@/components/report/report-form";

type SearchParams = {
  type?: string;
  id?: string;
};

export default async function MeldenPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const type = params.type ?? "unbekannt";
  const id = params.id ?? "-";
  const reportLink = `mailto:abuse@example.com?subject=${encodeURIComponent(`Meldung Inhalt (${type})`)}`;

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Beitrag melden</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Danke für deinen Hinweis. Wir prüfen gemeldete Inhalte zeitnah und entfernen rechtswidrige Inhalte nach Prüfung.
      </p>

      <section className="mt-6 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Meldedetails</h2>
        <p className="text-sm text-zinc-700">Typ: {type}</p>
        <p className="text-sm text-zinc-700">ID: {id}</p>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Meldung absenden (in App)</h2>
        <p className="text-sm text-zinc-700">
          Deine Meldung wird serverseitig gespeichert und intern geprüft.
        </p>
        <ReportForm targetType={type} targetId={id} />
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Fallback</h2>
        <p className="text-sm text-zinc-700">Falls das Formular nicht funktioniert, kannst du uns alternativ per E-Mail schreiben.</p>
        <a href={reportLink} className="inline-flex h-10 items-center rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700">
          Meldung per E-Mail
        </a>
      </section>

      <p className="mt-6 text-sm text-zinc-600">
        Zurück zu <Link href="/spontan" className="underline">Spontan</Link> oder <Link href="/chat" className="underline">Chat</Link>.
      </p>
    </main>
  );
}
