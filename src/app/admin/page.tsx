import {
  deleteHangoutSubmissionAction,
  deletePartySubmissionAction,
  reviewHangoutSubmissionAction,
  reviewPartySubmissionAction,
} from "@/app/actions/admin-events";
import { updateFeedbackStatusAction } from "@/app/actions/feedback";
import { CheckCircle2, CircleX, Lightbulb, MessageSquareText, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatEuroFromCents } from "@/lib/format";
import { requireInternalAdmin } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";
import { validateSupabaseAdminConfig } from "@/lib/supabase/validate";

export const dynamic = "force-dynamic";

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

type ReviewedParty = PendingParty;
type ReviewedHangout = PendingHangout;

type FeedbackEntry = {
  id: string;
  type: "feedback" | "feature_request";
  title: string;
  message: string;
  contact_email: string | null;
  status: "open" | "reviewing" | "planned" | "closed";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const FEEDBACK_STATUS_BADGE: Record<FeedbackEntry["status"], string> = {
  open: "bg-amber-50 text-amber-700",
  reviewing: "bg-blue-50 text-blue-700",
  planned: "bg-violet-50 text-violet-700",
  closed: "bg-emerald-50 text-emerald-700",
};

function feedbackTypeLabel(type: FeedbackEntry["type"]) {
  return type === "feature_request" ? "Feature Request" : "Feedback";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{
    type?: string;
    scope?: string;
    decision?: string;
    message?: string;
  }>;
}) {
  await requireInternalAdmin();
  const supabase = await createClient();
  const resolvedSearchParams = (await searchParams) ?? {};
  const adminConfig = validateSupabaseAdminConfig();
  const actionNotice =
    typeof resolvedSearchParams.message === "string" && resolvedSearchParams.message.trim().length > 0
      ? {
          type: resolvedSearchParams.type === "success" ? "success" : "error",
          message: resolvedSearchParams.message.trim(),
        }
      : null;

  const pendingQuery = await supabase
    .from("parties")
    .select("*")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });

  const fallbackPendingQuery = await (isMissingColumnError(pendingQuery.error?.code)
    ? supabase
        .from("parties")
      .select("*")
        .eq("status", "draft")
        .order("created_at", { ascending: true })
    : Promise.resolve({ data: null as null, error: null as null }));

  const useFallback = isMissingColumnError(pendingQuery.error?.code);
  const fallbackErrorCode = useFallback ? fallbackPendingQuery.error?.code : pendingQuery.error?.code;

  const legacyPendingQuery = await (isMissingColumnError(fallbackErrorCode)
    ? supabase
        .from("parties")
      .select("*")
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
    .select("*")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });

  const rawHangouts = (pendingHangoutsQuery.data ?? []) as Array<Record<string, unknown>>;
  const hangoutError = pendingHangoutsQuery.error;

  const pendingHangouts: PendingHangout[] = rawHangouts.map((row) => ({
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    submitter_name: typeof row.submitter_name === "string" && row.submitter_name.trim() ? row.submitter_name.trim() : null,
    title: String(row.title ?? "Unbenannt"),
    description: typeof row.description === "string" ? row.description : null,
    location_text: typeof row.location_text === "string" ? row.location_text : null,
    meetup_at: typeof row.meetup_at === "string" ? row.meetup_at : null,
    created_at: String(row.created_at ?? ""),
    activity_type:
      typeof row.activity_type === "string"
        ? row.activity_type
        : typeof row.kind === "string"
          ? row.kind
          : null,
  }));

  const approvedQuery = await supabase
    .from("parties")
    .select("*")
    .eq("review_status", "approved")
    .order("created_at", { ascending: false })
    .limit(40);

  const fallbackApprovedQuery = await (isMissingColumnError(approvedQuery.error?.code)
    ? supabase
        .from("parties")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(40)
    : Promise.resolve({ data: null as null, error: null as null }));

  const useApprovedFallback = isMissingColumnError(approvedQuery.error?.code);
  const approvedFallbackErrorCode = useApprovedFallback
    ? fallbackApprovedQuery.error?.code
    : approvedQuery.error?.code;

  const legacyApprovedQuery = await (isMissingColumnError(approvedFallbackErrorCode)
    ? supabase
        .from("parties")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(40)
    : Promise.resolve({ data: null as null, error: null as null }));

  const useApprovedLegacy = isMissingColumnError(approvedFallbackErrorCode);

  const rawApproved = useApprovedLegacy
    ? ((legacyApprovedQuery.data ?? []) as Array<Record<string, unknown>>)
    : useApprovedFallback
      ? ((fallbackApprovedQuery.data ?? []) as Array<Record<string, unknown>>)
      : ((approvedQuery.data ?? []) as Array<Record<string, unknown>>);

  const approvedParties: ReviewedParty[] = rawApproved.map((row) => ({
    id: String(row.id ?? ""),
    host_user_id: String(row.host_user_id ?? row.host_id ?? ""),
    submitter_name: typeof row.submitter_name === "string" && row.submitter_name.trim() ? row.submitter_name.trim() : null,
    title: String(row.title ?? "Unbenannt"),
    description: typeof row.description === "string" ? row.description : null,
    starts_at: String(row.starts_at ?? row.date ?? row.created_at ?? ""),
    max_guests: Number(row.max_guests ?? 0),
    contribution_cents: Number(row.contribution_cents ?? 0),
  }));

  const approvedHangoutsQuery = await supabase
    .from("hangouts")
    .select("*")
    .or("review_status.eq.approved,status.eq.published,is_published.eq.true")
    .order("created_at", { ascending: false })
    .limit(40);

  const approvedHangouts: ReviewedHangout[] = ((approvedHangoutsQuery.data ?? []) as Array<Record<string, unknown>>).map(
    (row) => ({
      id: String(row.id ?? ""),
      user_id: String(row.user_id ?? ""),
      submitter_name:
        typeof row.submitter_name === "string" && row.submitter_name.trim() ? row.submitter_name.trim() : null,
      title: String(row.title ?? "Unbenannt"),
      description: typeof row.description === "string" ? row.description : null,
      location_text: typeof row.location_text === "string" ? row.location_text : null,
      meetup_at: typeof row.meetup_at === "string" ? row.meetup_at : null,
      created_at: String(row.created_at ?? ""),
      activity_type:
        typeof row.activity_type === "string"
          ? row.activity_type
          : typeof row.kind === "string"
            ? row.kind
            : null,
    }),
  );

  const feedbackQuery = await supabase
    .from("feedback_entries")
    .select("id, type, title, message, contact_email, status, admin_note, created_at, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const feedbackError = feedbackQuery.error;
  const feedbackEntries: FeedbackEntry[] = ((feedbackQuery.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    type: row.type === "feature_request" ? "feature_request" : "feedback",
    title: String(row.title ?? "Ohne Titel"),
    message: String(row.message ?? ""),
    contact_email: typeof row.contact_email === "string" ? row.contact_email : null,
    status:
      row.status === "reviewing" || row.status === "planned" || row.status === "closed" ? row.status : "open",
    admin_note: typeof row.admin_note === "string" ? row.admin_note : null,
    created_at: String(row.created_at ?? ""),
    reviewed_at: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
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
      <ScreenHeader title="Admin" subtitle="Freigaben für neue Event-Einreichungen." />

      {!adminConfig.valid ? (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">Moderation ist derzeit deaktiviert.</p>
          <p className="mt-1 text-sm text-amber-800">{adminConfig.errors.join(" ")}</p>
        </Card>
      ) : null}

      {actionNotice ? (
        <Card className={actionNotice.type === "success" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}>
          <p className={actionNotice.type === "success" ? "text-sm text-emerald-800" : "text-sm text-rose-700"}>
            {actionNotice.message}
          </p>
        </Card>
      ) : null}

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

      {feedbackError ? (
        <Card>
          <p className="text-sm text-rose-600">Feedback-Einträge konnten nicht geladen werden.</p>
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
                  Max {party.max_guests} Gäste | Beitrag {formatEuroFromCents(Number(party.contribution_cents ?? 0))}
                </p>
                {party.description ? <p className="text-sm text-zinc-700">{party.description}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <form action={reviewPartySubmissionAction}>
                  <input type="hidden" name="partyId" value={party.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button type="submit" disabled={!adminConfig.valid} className="h-11 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={16} />
                      <span>Freigeben</span>
                    </span>
                  </button>
                </form>
                <form action={reviewPartySubmissionAction}>
                  <input type="hidden" name="partyId" value={party.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <button type="submit" disabled={!adminConfig.valid} className="h-11 w-full rounded-2xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]">
                    <span className="inline-flex items-center gap-1.5">
                      <CircleX size={16} />
                      <span>Ablehnen</span>
                    </span>
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
                  <button type="submit" disabled={!adminConfig.valid} className="h-11 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={16} />
                      <span>Freigeben</span>
                    </span>
                  </button>
                </form>
                <form action={reviewHangoutSubmissionAction}>
                  <input type="hidden" name="hangoutId" value={hangout.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <button type="submit" disabled={!adminConfig.valid} className="h-11 w-full rounded-2xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]">
                    <span className="inline-flex items-center gap-1.5">
                      <CircleX size={16} />
                      <span>Ablehnen</span>
                    </span>
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

      <section className="mt-6 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Freigegeben Party ({approvedParties.length})
        </h2>

        {approvedParties.length ? (
          approvedParties.map((party) => (
            <Card key={`approved-party-${party.id}`} className="space-y-1 border-emerald-100 bg-emerald-50/40">
              <p className="text-sm font-semibold text-zinc-900">{party.title}</p>
              <p className="text-xs text-zinc-500">
                von {hostNameMap.get(party.host_user_id) ?? party.submitter_name ?? "Gast"}
              </p>
              <p className="text-xs text-zinc-500">{formatDateTime(party.starts_at)}</p>
              <p className="text-xs font-medium text-emerald-700">Freigegeben</p>
              <form action={deletePartySubmissionAction} className="pt-2">
                <input type="hidden" name="partyId" value={party.id} />
                <button
                  type="submit"
                  disabled={!adminConfig.valid}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
                >
                  <Trash2 size={14} />
                  <span>Löschen</span>
                </button>
              </form>
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-sm text-zinc-500">Noch keine freigegebenen Party-Einreichungen.</p>
          </Card>
        )}
      </section>

      <section className="mt-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Freigegeben Community ({approvedHangouts.length})
        </h2>

        {approvedHangouts.length ? (
          approvedHangouts.map((hangout) => (
            <Card key={`approved-hangout-${hangout.id}`} className="space-y-1 border-emerald-100 bg-emerald-50/40">
              <p className="text-sm font-semibold text-zinc-900">{hangout.title}</p>
              <p className="text-xs text-zinc-500">
                von {hostNameMap.get(hangout.user_id) ?? hangout.submitter_name ?? "Gast"}
              </p>
              <p className="text-xs text-zinc-500">{formatDateTime(hangout.meetup_at ?? hangout.created_at)}</p>
              <p className="text-xs font-medium text-emerald-700">Freigegeben</p>
              <form action={deleteHangoutSubmissionAction} className="pt-2">
                <input type="hidden" name="hangoutId" value={hangout.id} />
                <button
                  type="submit"
                  disabled={!adminConfig.valid}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
                >
                  <Trash2 size={14} />
                  <span>Löschen</span>
                </button>
              </form>
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-sm text-zinc-500">Noch keine freigegebenen Community-Einreichungen.</p>
          </Card>
        )}
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Feedback & Feature Requests ({feedbackEntries.length})
        </h2>

        {feedbackEntries.length ? (
          feedbackEntries.map((entry) => {
            const Icon = entry.type === "feature_request" ? Lightbulb : MessageSquareText;

            return (
              <Card key={`feedback-${entry.id}`} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
                        <Icon size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{entry.title}</p>
                        <p className="text-xs text-zinc-500">{feedbackTypeLabel(entry.type)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500">Eingang: {formatDateTime(entry.created_at)}</p>
                    {entry.reviewed_at ? (
                      <p className="text-xs text-zinc-500">Zuletzt bearbeitet: {formatDateTime(entry.reviewed_at)}</p>
                    ) : null}
                    {entry.contact_email ? (
                      <p className="text-xs text-zinc-500">Kontakt: {entry.contact_email}</p>
                    ) : (
                      <p className="text-xs text-zinc-400">Kein Kontakt hinterlegt</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${FEEDBACK_STATUS_BADGE[entry.status]}`}>
                    {entry.status}
                  </span>
                </div>

                <p className="text-sm text-zinc-700">{entry.message}</p>

                {entry.admin_note ? (
                  <p className="rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700">Notiz: {entry.admin_note}</p>
                ) : null}

                <form action={updateFeedbackStatusAction} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input type="hidden" name="feedbackId" value={entry.id} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      name="status"
                      defaultValue={entry.status}
                      className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs"
                    >
                      <option value="open">open</option>
                      <option value="reviewing">reviewing</option>
                      <option value="planned">planned</option>
                      <option value="closed">closed</option>
                    </select>
                    <input
                      type="text"
                      name="adminNote"
                      defaultValue={entry.admin_note ?? ""}
                      placeholder="Interne Notiz"
                      className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs"
                    />
                  </div>
                  <button type="submit" className="h-10 rounded-xl bg-zinc-900 px-4 text-xs font-semibold text-white">
                    Speichern
                  </button>
                </form>
              </Card>
            );
          })
        ) : (
          <Card>
            <p className="text-sm text-zinc-500">Noch kein Nutzerfeedback vorhanden.</p>
          </Card>
        )}
      </section>
    </AppShell>
  );
}
