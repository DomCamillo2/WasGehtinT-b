import Link from "next/link";
import dynamic from "next/dynamic";
import { decideRequestAction } from "@/app/actions/requests";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatEuroFromCents } from "@/lib/format";
import { getRequestStatusMeta } from "@/lib/status-ui";
import { loadHostPageData } from "@/services/host/host-page-service";

const CreatePartyForm = dynamic(
  () => import("@/components/host/create-party-form").then((module) => module.CreatePartyForm),
  {
    loading: () => (
      <Card className="p-4">
        <p className="text-sm text-zinc-500">Party-Formular wird geladen...</p>
      </Card>
    ),
  },
);

export default async function HostPage() {
  const { dashboard, pendingRequests, vibes, isAdmin } = await loadHostPageData();

  return (
    <AppShell theme="new">
      <ScreenHeader title="Host" subtitle="Party erstellen und Anfragen verwalten." />

      <Link
        href="/host/webhooks"
        className="mb-3 inline-flex h-10 items-center rounded-2xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 shadow-[0_6px_16px_rgba(15,23,42,0.04)]"
      >
        Interne Webhook Events
      </Link>

      {isAdmin ? (
        <Link
          href="/admin"
          className="mb-3 ml-2 inline-flex h-10 items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-semibold text-emerald-700 shadow-[0_6px_16px_rgba(15,23,42,0.04)]"
        >
          Admin Freigaben
        </Link>
      ) : null}

      <>
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-amber-800">
            Club-Event einreichen: Nicht-Admins gehen zuerst in den Review und werden nach Freigabe veröffentlicht.
          </p>
        </Card>
        <CreatePartyForm vibes={vibes} />
      </>

      <section className="mt-5 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Offene Anfragen</h2>
        {pendingRequests.length ? (
          pendingRequests.map((request) => {
            const status = getRequestStatusMeta("pending");

            return (
              <Card key={request.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900">{request.partyTitle}</p>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-600">Gruppengröße: {request.groupSize}</p>
                <p className="text-xs text-zinc-600">{request.message}</p>
                <div className="grid grid-cols-2 gap-2">
                  <form action={decideRequestAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="decision" value="accepted" />
                    <button className="h-11 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-white transition active:scale-[0.99]">
                      Annehmen
                    </button>
                  </form>
                  <form action={decideRequestAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button className="h-11 w-full rounded-2xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 transition active:scale-[0.99]">
                      Ablehnen
                    </button>
                  </form>
                </div>
              </Card>
            );
          })
        ) : (
          <Card>
            <p className="text-sm text-zinc-500">Keine offenen Anfragen.</p>
          </Card>
        )}
      </section>

      <section className="mt-5 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Meine Partys</h2>
        {dashboard.length ? (
          dashboard.map((row) => (
            <Card key={row.partyId} className="space-y-1">
              <p className="font-semibold text-zinc-900">{row.title}</p>
              <p className="text-xs text-zinc-500">{formatDateTime(row.startsAt)}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                  Pending: {row.pendingRequests}
                </p>
                <p className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                  Accepted: {row.acceptedRequests}
                </p>
                <p className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">
                  Freie Plätze: {row.spotsLeft}
                </p>
                <p className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-violet-700">
                  Beitrag: {formatEuroFromCents(row.paidTotalCents)}
                </p>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-sm text-zinc-500">Du hast noch keine Party erstellt.</p>
          </Card>
        )}
      </section>
    </AppShell>
  );
}
