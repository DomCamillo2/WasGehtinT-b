import Link from "next/link";
import { retryWebhookEventAction } from "@/app/actions/webhooks";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Card } from "@/components/ui/card";
import { requireInternalAdmin } from "@/lib/admin-guard";
import { formatDateTime } from "@/lib/format";
import { loadHostWebhookEvents } from "@/services/host/webhook-events-page-service";

type SearchParams = Promise<{ status?: string; q?: string }>;

type StatusFilter = "all" | "failed" | "pending" | "processed";

function statusBadge(processedAt: string | null, error: string | null) {
  if (error) {
    return "bg-red-50 text-red-700";
  }
  if (processedAt) {
    return "bg-emerald-50 text-emerald-700";
  }
  return "bg-amber-50 text-amber-700";
}

function statusLabel(processedAt: string | null, error: string | null) {
  if (error) {
    return "failed";
  }
  if (processedAt) {
    return "processed";
  }
  return "pending";
}

function filterHref(status: StatusFilter, q: string) {
  const params = new URLSearchParams();
  if (status !== "all") {
    params.set("status", status);
  }
  if (q.trim()) {
    params.set("q", q.trim());
  }

  const query = params.toString();
  return query ? `/host/webhooks?${query}` : "/host/webhooks";
}

export default async function HostWebhookEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireInternalAdmin();
  const params = await searchParams;
  const requestedStatus = String(params.status ?? "all") as StatusFilter;
  const activeStatus: StatusFilter = ["all", "failed", "pending", "processed"].includes(
    requestedStatus,
  )
    ? requestedStatus
    : "all";
  const q = String(params.q ?? "").trim().toLowerCase();

  const events = await loadHostWebhookEvents(150);
  const filteredEvents = events.filter((event) => {
    const state = statusLabel(event.processedAt, event.processingError);
    const matchesStatus = activeStatus === "all" || state === activeStatus;
    const matchesQuery =
      !q || event.eventId.toLowerCase().includes(q) || event.eventType.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const failedCount = events.filter((event) => event.processingError).length;

  return (
    <AppShell>
      <ScreenHeader title="Webhook Events" subtitle="Interne Stripe-Verarbeitung und Fehlerstatus" />

      <Card className="mb-3 grid grid-cols-2 gap-2 text-xs text-zinc-700">
        <p>Gesamt: {events.length}</p>
        <p>Fehlgeschlagen: {failedCount}</p>
      </Card>

      <Card className="mb-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/host/reports"
            className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white"
          >
            Zu Reports
          </Link>
          {(["all", "failed", "pending", "processed"] as StatusFilter[]).map((status) => (
            <Link
              key={status}
              href={filterHref(status, q)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeStatus === status ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {status}
            </Link>
          ))}
        </div>

        <form method="get" className="flex items-center gap-2">
          {activeStatus !== "all" ? <input type="hidden" name="status" value={activeStatus} /> : null}
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Suche Event-ID oder Typ"
            className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
          />
          <button className="h-10 rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white">
            Suchen
          </button>
        </form>
      </Card>

      <div className="space-y-2">
        {filteredEvents.length ? (
          filteredEvents.map((event) => (
            <Card key={event.eventId} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-900">{event.eventType}</p>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusBadge(
                    event.processedAt,
                    event.processingError,
                  )}`}
                >
                  {statusLabel(event.processedAt, event.processingError)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px] text-zinc-600">
                <p>Mode: {event.livemode ? "live" : "test"}</p>
                <p>Erstellt: {formatDateTime(event.createdAt)}</p>
                <p>ID: {event.eventId.slice(0, 18)}...</p>
                <p>Verarbeitet: {event.processedAt ? formatDateTime(event.processedAt) : "-"}</p>
              </div>

              {event.processingError ? (
                <div className="space-y-2">
                  <p className="rounded-lg bg-red-50 px-2 py-1 text-[11px] text-red-700">
                    Fehler: {event.processingError}
                  </p>
                  <form action={retryWebhookEventAction}>
                    <input type="hidden" name="eventId" value={event.eventId} />
                    <button
                      type="submit"
                      className="h-8 rounded-lg bg-zinc-900 px-3 text-[11px] font-semibold text-white"
                    >
                      Retry Event
                    </button>
                  </form>
                </div>
              ) : null}
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-sm text-zinc-500">Keine Webhook-Events fuer die aktuelle Filterung gefunden.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
