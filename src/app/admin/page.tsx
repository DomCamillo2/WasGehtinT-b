import { reviewPartySubmissionAction } from "@/app/actions/admin-events";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatEuroFromCents } from "@/lib/format";
import { requireInternalAdmin } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  await requireInternalAdmin();
  const supabase = await createClient();

  const { data: pendingRows, error } = await supabase
    .from("parties")
    .select("id, host_user_id, title, description, starts_at, ends_at, max_guests, contribution_cents, created_at")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });

  const pending = (pendingRows ?? []) as Array<{
    id: string;
    host_user_id: string;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string;
    max_guests: number;
    contribution_cents: number;
    created_at: string;
  }>;

  const hostIds = Array.from(new Set(pending.map((row) => row.host_user_id)));
  const hostResult = hostIds.length
    ? await supabase.from("user_profiles").select("id, display_name").in("id", hostIds)
    : { data: [] as Array<{ id: string; display_name: string | null }> };

  const hostNameMap = new Map(
    ((hostResult.data ?? []) as Array<{ id: string; display_name: string | null }>).map((row) => [
      row.id,
      row.display_name?.trim() || "Betreiber",
    ]),
  );

  return (
    <AppShell>
      <ScreenHeader title="Admin" subtitle="Freigaben fuer neue Event-Einreichungen." />

      {error ? (
        <Card>
          <p className="text-sm text-rose-600">Pending Events konnten nicht geladen werden.</p>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pending ({pending.length})</h2>

        {pending.length ? (
          pending.map((party) => (
            <Card key={party.id} className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900">{party.title}</p>
                <p className="text-xs text-zinc-500">von {hostNameMap.get(party.host_user_id) ?? "Betreiber"}</p>
                <p className="text-xs text-zinc-500">{formatDateTime(party.starts_at)}</p>
                <p className="text-xs text-zinc-500">
                  Max {party.max_guests} Gaeste | Beitrag {formatEuroFromCents(Number(party.contribution_cents ?? 0))}
                </p>
                {party.description ? <p className="text-sm text-zinc-700">{party.description}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <form action={reviewPartySubmissionAction}>
                  <input type="hidden" name="partyId" value={party.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button className="h-11 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-white transition active:scale-[0.99]">
                    Freigeben
                  </button>
                </form>
                <form action={reviewPartySubmissionAction}>
                  <input type="hidden" name="partyId" value={party.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <button className="h-11 w-full rounded-2xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 transition active:scale-[0.99]">
                    Ablehnen
                  </button>
                </form>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-sm text-zinc-500">Aktuell keine offenen Einreichungen.</p>
          </Card>
        )}
      </section>
    </AppShell>
  );
}
