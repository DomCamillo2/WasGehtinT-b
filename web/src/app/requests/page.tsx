import Link from "next/link";
import { startCheckoutAction } from "@/app/actions/payments";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatEuroFromCents } from "@/lib/format";
import { getPaymentStatusMeta, getRequestStatusMeta } from "@/lib/status-ui";
import { loadRequestsPageData } from "@/services/requests/requests-page-service";

export default async function RequestsPage() {
  const { requests } = await loadRequestsPageData();

  return (
    <AppShell theme="new">
      <ScreenHeader title="Meine Anfragen" subtitle="Status für deine Gruppenanfragen." />

      <div className="space-y-3">
        {requests.length ? (
          requests.map((request) => {
            const requestStatus = getRequestStatusMeta(request.requestStatus);
            const paymentStatus = getPaymentStatusMeta(request.paymentStatus);

            return (
              <Card key={request.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-900">{request.partyTitle}</p>
                    <p className="text-xs text-zinc-500">Start: {formatDateTime(request.startsAt)}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${requestStatus.className}`}>
                    {requestStatus.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600">
                  <p>Gruppe: {request.groupSize}</p>
                  <p>Gesamt: {formatEuroFromCents(request.totalCents)}</p>
                </div>

                <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentStatus.className}`}>
                  Zahlung: {paymentStatus.label}
                </div>

                {request.requestStatus === "accepted" ? (
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <Link
                      href={`/party/${request.partyId}/address`}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 transition active:scale-[0.99]"
                    >
                      Adresse anzeigen
                    </Link>

                    {request.paymentStatus !== "paid" ? (
                      <form action={startCheckoutAction}>
                        <input
                          type="hidden"
                          name="partyRequestId"
                          value={request.id}
                        />
                        <button className="h-10 w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-xs font-semibold text-white transition active:scale-[0.99]">
                          Beitrag zahlen
                        </button>
                      </form>
                    ) : (
                      <div className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700">
                        Zahlung bestätigt
                      </div>
                    )}
                  </div>
                ) : null}
              </Card>
            );
          })
        ) : (
          <Card>
            <p className="text-sm text-zinc-500">Du hast noch keine Anfragen gestellt.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
