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
import { validateSupabaseAdminConfig } from "@/lib/supabase/validate";
import { type FeedbackEntry, loadAdminDashboardData } from "@/services/admin/admin-dashboard-service";

export const dynamic = "force-dynamic";

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
  const resolvedSearchParams = (await searchParams) ?? {};
  const adminConfig = validateSupabaseAdminConfig();
  const actionNotice =
    typeof resolvedSearchParams.message === "string" && resolvedSearchParams.message.trim().length > 0
      ? {
          type: resolvedSearchParams.type === "success" ? "success" : "error",
          message: resolvedSearchParams.message.trim(),
        }
      : null;
  const {
    pending,
    pendingError: error,
    pendingHangouts,
    pendingHangoutsError: hangoutError,
    approvedParties,
    approvedHangouts,
    feedbackEntries,
    feedbackError,
    hostNameMap,
  } = await loadAdminDashboardData();

  return (
    <AppShell>
      <ScreenHeader title="Admin" subtitle="Freigaben fuer neue Event-Einreichungen." />

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
          <p className="text-sm text-rose-600">Feedback-Eintraege konnten nicht geladen werden.</p>
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
                  von {hostNameMap.get(party.hostUserId) ?? party.submitterName ?? "Gast"}
                </p>
                <p className="text-xs text-zinc-500">{formatDateTime(party.startsAt)}</p>
                <p className="text-xs text-zinc-500">
                  Max {party.maxGuests} Gaeste | Beitrag {formatEuroFromCents(Number(party.contributionCents ?? 0))}
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
                  von {hostNameMap.get(hangout.userId) ?? hangout.submitterName ?? "Gast"}
                </p>
                <p className="text-xs text-zinc-500">{formatDateTime(hangout.meetupAt ?? hangout.createdAt)}</p>
                {hangout.locationText ? <p className="text-xs text-zinc-500">Ort: {hangout.locationText}</p> : null}
                {hangout.activityType ? <p className="text-xs text-zinc-500">Typ: {hangout.activityType}</p> : null}
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
                von {hostNameMap.get(party.hostUserId) ?? party.submitterName ?? "Gast"}
              </p>
              <p className="text-xs text-zinc-500">{formatDateTime(party.startsAt)}</p>
              <p className="text-xs font-medium text-emerald-700">Freigegeben</p>
              <form action={deletePartySubmissionAction} className="pt-2">
                <input type="hidden" name="partyId" value={party.id} />
                <button
                  type="submit"
                  disabled={!adminConfig.valid}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
                >
                  <Trash2 size={14} />
                  <span>Loeschen</span>
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
                von {hostNameMap.get(hangout.userId) ?? hangout.submitterName ?? "Gast"}
              </p>
              <p className="text-xs text-zinc-500">{formatDateTime(hangout.meetupAt ?? hangout.createdAt)}</p>
              <p className="text-xs font-medium text-emerald-700">Freigegeben</p>
              <form action={deleteHangoutSubmissionAction} className="pt-2">
                <input type="hidden" name="hangoutId" value={hangout.id} />
                <button
                  type="submit"
                  disabled={!adminConfig.valid}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
                >
                  <Trash2 size={14} />
                  <span>Loeschen</span>
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
                    <p className="text-xs text-zinc-500">Eingang: {formatDateTime(entry.createdAt)}</p>
                    {entry.reviewedAt ? (
                      <p className="text-xs text-zinc-500">Zuletzt bearbeitet: {formatDateTime(entry.reviewedAt)}</p>
                    ) : null}
                    {entry.contactEmail ? (
                      <p className="text-xs text-zinc-500">Kontakt: {entry.contactEmail}</p>
                    ) : (
                      <p className="text-xs text-zinc-400">Kein Kontakt hinterlegt</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${FEEDBACK_STATUS_BADGE[entry.status]}`}>
                    {entry.status}
                  </span>
                </div>

                <p className="text-sm text-zinc-700">{entry.message}</p>

                {entry.adminNote ? (
                  <p className="rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700">Notiz: {entry.adminNote}</p>
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
                      defaultValue={entry.adminNote ?? ""}
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
