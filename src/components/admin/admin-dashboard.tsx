import {
  deleteHangoutSubmissionAction,
  deletePartySubmissionAction,
  reviewHangoutSubmissionAction,
  reviewPartySubmissionAction,
} from "@/app/actions/admin-events";
import { updateFeedbackStatusAction } from "@/app/actions/feedback";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatEuroFromCents } from "@/lib/format";
import { type FeedbackEntry, type PendingHangout, type PendingParty } from "@/services/admin/admin-dashboard-service";
import { type AdminPageData } from "@/services/admin/admin-page-service";
import { CheckCircle2, CircleX, Lightbulb, MessageSquareText, Trash2 } from "lucide-react";

const FEEDBACK_STATUS_BADGE: Record<FeedbackEntry["status"], string> = {
  open: "bg-amber-50 text-amber-700",
  reviewing: "bg-blue-50 text-blue-700",
  planned: "bg-violet-50 text-violet-700",
  closed: "bg-emerald-50 text-emerald-700",
};

type AdminDashboardProps = AdminPageData;

function feedbackTypeLabel(type: FeedbackEntry["type"]) {
  return type === "feature_request" ? "Feature Request" : "Feedback";
}

function NoticeCard(props: { message: string; tone: "success" | "error" | "warning" }) {
  const className =
    props.tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : props.tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-rose-200 bg-rose-50";

  const textClassName =
    props.tone === "success"
      ? "text-sm text-emerald-800"
      : props.tone === "warning"
        ? "text-sm text-amber-800"
        : "text-sm text-rose-700";

  return (
    <Card className={className}>
      <p className={textClassName}>{props.message}</p>
    </Card>
  );
}

function EmptyStateCard(props: { message: string }) {
  return (
    <Card>
      <p className="text-sm text-zinc-500">{props.message}</p>
    </Card>
  );
}

function ModerationButton(props: {
  action: (formData: FormData) => Promise<void>;
  hiddenInputName: "partyId" | "hangoutId";
  entityId: string;
  decision: "approve" | "reject";
  disabled: boolean;
}) {
  const isApprove = props.decision === "approve";

  return (
    <form action={props.action}>
      <input type="hidden" name={props.hiddenInputName} value={props.entityId} />
      <input type="hidden" name="decision" value={props.decision} />
      <button
        type="submit"
        disabled={props.disabled}
        className={
          isApprove
            ? "h-11 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
            : "h-11 w-full rounded-2xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
        }
      >
        <span className="inline-flex items-center gap-1.5">
          {isApprove ? <CheckCircle2 size={16} /> : <CircleX size={16} />}
          <span>{isApprove ? "Freigeben" : "Ablehnen"}</span>
        </span>
      </button>
    </form>
  );
}

function DeleteButton(props: {
  action: (formData: FormData) => Promise<void>;
  hiddenInputName: "partyId" | "hangoutId";
  entityId: string;
  disabled: boolean;
}) {
  return (
    <form action={props.action} className="pt-2">
      <input type="hidden" name={props.hiddenInputName} value={props.entityId} />
      <button
        type="submit"
        disabled={props.disabled}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
      >
        <Trash2 size={14} />
        <span>Loeschen</span>
      </button>
    </form>
  );
}

function PendingPartySection(props: {
  pending: PendingParty[];
  hostNameMap: Map<string, string>;
  adminConfigValid: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pending ({props.pending.length})</h2>

      {props.pending.length ? (
        props.pending.map((party) => (
          <Card key={party.id} className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-900">{party.title}</p>
              <p className="text-xs text-zinc-500">
                von {props.hostNameMap.get(party.hostUserId) ?? party.submitterName ?? "Gast"}
              </p>
              <p className="text-xs text-zinc-500">{formatDateTime(party.startsAt)}</p>
              <p className="text-xs text-zinc-500">
                Max {party.maxGuests} Gaeste | Beitrag {formatEuroFromCents(Number(party.contributionCents ?? 0))}
              </p>
              {party.description ? <p className="text-sm text-zinc-700">{party.description}</p> : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ModerationButton
                action={reviewPartySubmissionAction}
                hiddenInputName="partyId"
                entityId={party.id}
                decision="approve"
                disabled={!props.adminConfigValid}
              />
              <ModerationButton
                action={reviewPartySubmissionAction}
                hiddenInputName="partyId"
                entityId={party.id}
                decision="reject"
                disabled={!props.adminConfigValid}
              />
            </div>
          </Card>
        ))
      ) : (
        <EmptyStateCard message="Aktuell keine offenen Einreichungen." />
      )}
    </section>
  );
}

function PendingHangoutSection(props: {
  pendingHangouts: PendingHangout[];
  hostNameMap: Map<string, string>;
  adminConfigValid: boolean;
}) {
  return (
    <section className="mt-5 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Spontan Pending ({props.pendingHangouts.length})
      </h2>

      {props.pendingHangouts.length ? (
        props.pendingHangouts.map((hangout) => (
          <Card key={hangout.id} className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-900">{hangout.title}</p>
              <p className="text-xs text-zinc-500">
                von {props.hostNameMap.get(hangout.userId) ?? hangout.submitterName ?? "Gast"}
              </p>
              <p className="text-xs text-zinc-500">{formatDateTime(hangout.meetupAt ?? hangout.createdAt)}</p>
              {hangout.locationText ? <p className="text-xs text-zinc-500">Ort: {hangout.locationText}</p> : null}
              {hangout.activityType ? <p className="text-xs text-zinc-500">Typ: {hangout.activityType}</p> : null}
              {hangout.description ? <p className="text-sm text-zinc-700">{hangout.description}</p> : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ModerationButton
                action={reviewHangoutSubmissionAction}
                hiddenInputName="hangoutId"
                entityId={hangout.id}
                decision="approve"
                disabled={!props.adminConfigValid}
              />
              <ModerationButton
                action={reviewHangoutSubmissionAction}
                hiddenInputName="hangoutId"
                entityId={hangout.id}
                decision="reject"
                disabled={!props.adminConfigValid}
              />
            </div>
          </Card>
        ))
      ) : (
        <EmptyStateCard message="Aktuell keine offenen Spontan-Einreichungen." />
      )}
    </section>
  );
}

function ApprovedPartySection(props: {
  approvedParties: PendingParty[];
  hostNameMap: Map<string, string>;
  adminConfigValid: boolean;
}) {
  return (
    <section className="mt-6 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Freigegeben Party ({props.approvedParties.length})
      </h2>

      {props.approvedParties.length ? (
        props.approvedParties.map((party) => (
          <Card key={`approved-party-${party.id}`} className="space-y-1 border-emerald-100 bg-emerald-50/40">
            <p className="text-sm font-semibold text-zinc-900">{party.title}</p>
            <p className="text-xs text-zinc-500">
              von {props.hostNameMap.get(party.hostUserId) ?? party.submitterName ?? "Gast"}
            </p>
            <p className="text-xs text-zinc-500">{formatDateTime(party.startsAt)}</p>
            <p className="text-xs font-medium text-emerald-700">Freigegeben</p>
            <DeleteButton
              action={deletePartySubmissionAction}
              hiddenInputName="partyId"
              entityId={party.id}
              disabled={!props.adminConfigValid}
            />
          </Card>
        ))
      ) : (
        <EmptyStateCard message="Noch keine freigegebenen Party-Einreichungen." />
      )}
    </section>
  );
}

function ApprovedHangoutSection(props: {
  approvedHangouts: PendingHangout[];
  hostNameMap: Map<string, string>;
  adminConfigValid: boolean;
}) {
  return (
    <section className="mt-5 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Freigegeben Community ({props.approvedHangouts.length})
      </h2>

      {props.approvedHangouts.length ? (
        props.approvedHangouts.map((hangout) => (
          <Card key={`approved-hangout-${hangout.id}`} className="space-y-1 border-emerald-100 bg-emerald-50/40">
            <p className="text-sm font-semibold text-zinc-900">{hangout.title}</p>
            <p className="text-xs text-zinc-500">
              von {props.hostNameMap.get(hangout.userId) ?? hangout.submitterName ?? "Gast"}
            </p>
            <p className="text-xs text-zinc-500">{formatDateTime(hangout.meetupAt ?? hangout.createdAt)}</p>
            <p className="text-xs font-medium text-emerald-700">Freigegeben</p>
            <DeleteButton
              action={deleteHangoutSubmissionAction}
              hiddenInputName="hangoutId"
              entityId={hangout.id}
              disabled={!props.adminConfigValid}
            />
          </Card>
        ))
      ) : (
        <EmptyStateCard message="Noch keine freigegebenen Community-Einreichungen." />
      )}
    </section>
  );
}

function FeedbackSection(props: { feedbackEntries: FeedbackEntry[] }) {
  return (
    <section className="mt-6 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Feedback & Feature Requests ({props.feedbackEntries.length})
      </h2>

      {props.feedbackEntries.length ? (
        props.feedbackEntries.map((entry) => {
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
        <EmptyStateCard message="Noch kein Nutzerfeedback vorhanden." />
      )}
    </section>
  );
}

export function AdminDashboard(props: AdminDashboardProps) {
  const {
    adminConfig,
    actionNotice,
    dashboard: {
      pending,
      pendingError,
      pendingHangouts,
      pendingHangoutsError,
      approvedParties,
      approvedHangouts,
      feedbackEntries,
      feedbackError,
      hostNameMap,
    },
  } = props;

  return (
    <AppShell>
      <ScreenHeader title="Admin" subtitle="Freigaben fuer neue Event-Einreichungen." />

      {!adminConfig.valid ? (
        <NoticeCard message={`Moderation ist derzeit deaktiviert. ${adminConfig.errors.join(" ")}`.trim()} tone="warning" />
      ) : null}

      {actionNotice ? <NoticeCard message={actionNotice.message} tone={actionNotice.type} /> : null}
      {pendingError ? <NoticeCard message="Pending Events konnten nicht geladen werden." tone="error" /> : null}
      {pendingHangoutsError ? (
        <NoticeCard message="Pending Spontan-Posts konnten nicht geladen werden." tone="error" />
      ) : null}
      {feedbackError ? <NoticeCard message="Feedback-Eintraege konnten nicht geladen werden." tone="error" /> : null}

      <PendingPartySection pending={pending} hostNameMap={hostNameMap} adminConfigValid={adminConfig.valid} />
      <PendingHangoutSection
        pendingHangouts={pendingHangouts}
        hostNameMap={hostNameMap}
        adminConfigValid={adminConfig.valid}
      />
      <ApprovedPartySection
        approvedParties={approvedParties}
        hostNameMap={hostNameMap}
        adminConfigValid={adminConfig.valid}
      />
      <ApprovedHangoutSection
        approvedHangouts={approvedHangouts}
        hostNameMap={hostNameMap}
        adminConfigValid={adminConfig.valid}
      />
      <FeedbackSection feedbackEntries={feedbackEntries} />
    </AppShell>
  );
}
