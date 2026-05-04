import Link from "next/link";
import { Card } from "@/components/ui/card";
import { loadExternalEventsDebugPageData } from "@/services/events/external-events-debug-service";

type SearchParams = Promise<{ date?: string; vibe?: string }>;

export default async function ExternalEventsDebugPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const debugPageData = await loadExternalEventsDebugPageData(params);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 bg-zinc-50 px-4 py-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Debug</p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          External Events Test Page
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Prueft Scraper-Daten inkl. Schlachthaus mit Berlin-Datumfilter.
        </p>
      </div>

      <Card className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Total</p>
            <p className="text-lg font-semibold text-zinc-900">{debugPageData.totalCount}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Schlachthaus</p>
            <p className="text-lg font-semibold text-zinc-900">{debugPageData.schlachthausCount}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Filtered</p>
            <p className="text-lg font-semibold text-zinc-900">{debugPageData.filteredCount}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg bg-zinc-900 px-3 py-1.5 text-white" href="/debug/external-events">
            Reset
          </Link>
          <Link
            className="rounded-lg bg-zinc-200 px-3 py-1.5 text-zinc-900"
            href={`/debug/external-events?date=${debugPageData.quickDate}&vibe=all`}
          >
            Date {debugPageData.quickDate}
          </Link>
          <Link
            className="rounded-lg bg-zinc-200 px-3 py-1.5 text-zinc-900"
            href={`/debug/external-events?date=all&vibe=schlachthaus`}
          >
            Only Schlachthaus
          </Link>
          <Link
            className="rounded-lg bg-zinc-200 px-3 py-1.5 text-zinc-900"
            href={debugPageData.openDiscoverHref}
          >
            Open Discover
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {debugPageData.availableVibes.map((vibe) => (
            <Link
              key={vibe}
              href={`/debug/external-events?date=${debugPageData.selectedDate}&vibe=${encodeURIComponent(
                vibe.toLowerCase(),
              )}`}
              className="rounded-full border border-zinc-300 px-3 py-1 text-zinc-700"
            >
              {vibe}
            </Link>
          ))}
        </div>
      </Card>

      <div className="space-y-2">
        {debugPageData.items.map((event) => (
          <Card key={event.id} className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{event.vibeLabel}</p>
            <p className="text-base font-semibold text-zinc-900">{event.title}</p>
            <p className="text-sm text-zinc-700">Berlin: {event.berlinDateTime}</p>
            <p className="text-xs text-zinc-500">dateKey: {event.berlinDateKey}</p>
            <p className="text-xs text-zinc-500">startsAt (UTC): {event.startsAt}</p>
            <p className="text-xs text-zinc-500">id: {event.id}</p>
          </Card>
        ))}

        {debugPageData.items.length === 0 ? (
          <Card>
            <p className="text-sm text-zinc-700">
              Keine Events fuer die aktive Kombination gefunden.
            </p>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
