import { reviewHangoutSubmissionAction, reviewPartySubmissionAction } from "@/app/actions/admin-events";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatEuroFromCents } from "@/lib/format";
import { requireInternalAdmin } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

type PendingParty = {
  id: string;
  host_user_id: string;
  submitter_name: string | null;
  title: string;
  description: string | null;
  starts_at: string;
  max_guests: number;
  contribution_cents: number;
};

type PendingHangout = {
  id: string;
  user_id: string;
  submitter_name: string | null;
  title: string;
  description: string | null;
  location_text: string | null;
  meetup_at: string | null;
  created_at: string;
  activity_type: string | null;
};

export default async function AdminPage() {
  await requireInternalAdmin();
  const supabase = await createClient();

  const pendingQuery = await supabase
    .from("parties")
    .select("id, host_user_id, submitter_name, title, description, starts_at, max_guests, contribution_cents, created_at")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });

  const fallbackPendingQuery = await (isMissingColumnError(pendingQuery.error?.code)
    ? supabase
        .from("parties")
        .select("id, host_user_id, submitter_name, title, description, starts_at, max_guests, contribution_cents, created_at")
        .eq("status", "draft")
        .order("created_at", { ascending: true })
    : Promise.resolve({ data: null as null, error: null as null }));

  const useFallback = isMissingColumnError(pendingQuery.error?.code);
  const fallbackErrorCode = useFallback ? fallbackPendingQuery.error?.code : pendingQuery.error?.code;

  const legacyPendingQuery = await (isMissingColumnError(fallbackErrorCode)
    ? supabase
        .from("parties")
        .select("id, host_id, submitter_name, title, description, date, created_at")
        .eq("is_published", false)
        .order("created_at", { ascending: true })
    : Promise.resolve({ data: null as null, error: null as null }));

  const useLegacy = isMissingColumnError(fallbackErrorCode);

  const rawPending = useLegacy
    ? ((legacyPendingQuery.data ?? []) as Array<Record<string, unknown>>)
    : useFallback
      ? ((fallbackPendingQuery.data ?? []) as Array<Record<string, unknown>>)
      : ((pendingQuery.data ?? []) as Array<Record<string, unknown>>);

  const error = useLegacy ? legacyPendingQuery.error : useFallback ? fallbackPendingQuery.error : pendingQuery.error;

  const pending: PendingParty[] = rawPending.map((row) => ({
    id: String(row.id ?? ""),
    host_user_id: String(row.host_user_id ?? row.host_id ?? ""),
    submitter_name: typeof row.submitter_name === "string" && row.submitter_name.trim() ? row.submitter_name.trim() : null,
    title: String(row.title ?? "Unbenannt"),
    description: typeof row.description === "string" ? row.description : null,
    starts_at: String(row.starts_at ?? row.date ?? row.created_at ?? ""),
    max_guests: Number(row.max_guests ?? 0),
    contribution_cents: Number(row.contribution_cents ?? 0),
  }));

  const pendingHangoutsQuery = await supabase
    .from("hangouts")
    .select("id, user_id, submitter_name, title, description, location_text, meetup_at, created_at, activity_type")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });

  const pendingHangoutsFallback = await (isMissingColumnError(pendingHangoutsQuery.error?.code)
    ? supabase
        .from("hangouts")
        .select("id, user_id, submitter_name, title, description, location_text, meetup_at, created_at, activity_type")
        .eq("is_published", false)
        .order("created_at", { ascending: true })
    : Promise.resolve({ data: null as null, error: null as null }));

  const pendingHangoutsLegacy = await (isMissingColumnError(
    (isMissingColumnError(pendingHangoutsQuery.error?.code)
      ? pendingHangoutsFallback.error?.code
      : pendingHangoutsQuery.error?.code),
  )
    ? supabase
        .from("hangouts")
        .select("id, user_id, title, description, created_at, activity_type")
        .order("created_at", { ascending: true })
    : Promise.resolve({ data: null as null, error: null as null }));

  const useHangoutFallback = isMissingColumnError(pendingHangoutsQuery.error?.code);
  const hangoutFallbackErrorCode = useHangoutFallback ? pendingHangoutsFallback.error?.code : pendingHangoutsQuery.error?.code;
  const useHangoutLegacy = isMissingColumnError(hangoutFallbackErrorCode);

  const rawHangouts = useHangoutLegacy
    ? ((pendingHangoutsLegacy.data ?? []) as Array<Record<string, unknown>>)
    : useHangoutFallback
      ? ((pendingHangoutsFallback.data ?? []) as Array<Record<string, unknown>>)
      : ((pendingHangoutsQuery.data ?? []) as Array<Record<string, unknown>>);

  const hangoutError = useHangoutLegacy
    ? pendingHangoutsLegacy.error
    : useHangoutFallback
      ? pendingHangoutsFallback.error
      : pendingHangoutsQuery.error;

  const pendingHangouts: PendingHangout[] = rawHangouts.map((row) => ({
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    submitter_name: typeof row.submitter_name === "string" && row.submitter_name.trim() ? row.submitter_name.trim() : null,
    title: String(row.title ?? "Unbenannt"),
    description: typeof row.description === "string" ? row.description : null,
    location_text: typeof row.location_text === "string" ? row.location_text : null,
    meetup_at: typeof row.meetup_at === "string" ? row.meetup_at : null,
    created_at: String(row.created_at ?? ""),
    activity_type: typeof row.activity_type === "string" ? row.activity_type : null,
  }));

  const hostIds = Array.from(
    new Set(
      pending
        .map((row) => row.host_user_id)
        .filter((value) => typeof value === "string" && value.length > 0),
    ),
  );

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

      {hangoutError ? (
        <Card>
          <p className="text-sm text-rose-600">Pending Spontan-Posts konnten nicht geladen werden.</p>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pending ({pending.length})</h2>

        {pending.length ? (
          pending.map((party) => (
            <Card key={party.id} className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900">{party.title}</p>
                <p className="text-xs text-zinc-500">
                  von {hostNameMap.get(party.host_user_id) ?? party.submitter_name ?? "Gast"}
                </p>
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

      <section className="mt-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Spontan Pending ({pendingHangouts.length})
        </h2>

        {pendingHangouts.length ? (
          pendingHangouts.map((hangout) => (
            <Card key={hangout.id} className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900">{hangout.title}</p>
                <p className="text-xs text-zinc-500">
                  von {hostNameMap.get(hangout.user_id) ?? hangout.submitter_name ?? "Gast"}
                </p>
                <p className="text-xs text-zinc-500">{formatDateTime(hangout.meetup_at ?? hangout.created_at)}</p>
                {hangout.location_text ? <p className="text-xs text-zinc-500">Ort: {hangout.location_text}</p> : null}
                {hangout.activity_type ? <p className="text-xs text-zinc-500">Typ: {hangout.activity_type}</p> : null}
                {hangout.description ? <p className="text-sm text-zinc-700">{hangout.description}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <form action={reviewHangoutSubmissionAction}>
                  <input type="hidden" name="hangoutId" value={hangout.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button className="h-11 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-white transition active:scale-[0.99]">
                    Freigeben
                  </button>
                </form>
                <form action={reviewHangoutSubmissionAction}>
                  <input type="hidden" name="hangoutId" value={hangout.id} />
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
            <p className="text-sm text-zinc-500">Aktuell keine offenen Spontan-Einreichungen.</p>
          </Card>
        )}
      </section>
    </AppShell>
  );
}
