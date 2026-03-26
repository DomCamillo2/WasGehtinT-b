import Link from "next/link";
import { updateContentReportStatusAction } from "@/app/actions/reports";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { requireInternalAdmin } from "@/lib/admin-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SearchParams = Promise<{ status?: string }>;
type Filter = "all" | "open" | "reviewing" | "resolved" | "rejected";

type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string;
  status: "open" | "reviewing" | "resolved" | "rejected";
  created_at: string;
  reporter_user_id: string;
  review_note: string | null;
  reviewed_at: string | null;
};

function filterHref(status: Filter) {
  return status === "all" ? "/host/reports" : `/host/reports?status=${status}`;
}

const BADGE: Record<ReportRow["status"], string> = {
  open: "bg-amber-50 text-amber-700",
  reviewing: "bg-blue-50 text-blue-700",
  resolved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-zinc-100 text-zinc-700",
};

export default async function HostReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireInternalAdmin();
  const params = await searchParams;
  const requested = String(params.status ?? "all").trim() as Filter;
  const active: Filter = ["all", "open", "reviewing", "resolved", "rejected"].includes(requested)
    ? requested
    : "all";

  const supabaseAdmin = getSupabaseAdmin() as unknown as {
    from: (table: string) => {
      select: (query: string) => {
        order: (column: string, args: { ascending: boolean }) => { limit: (count: number) => Promise<{ data: unknown[] | null }> };
      };
    };
  };

  const { data } = await supabaseAdmin
    .from("content_reports")
    .select("id, target_type, target_id, reason, details, status, created_at, reporter_user_id, review_note, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const allReports = (data ?? []) as ReportRow[];
  const reports = active === "all" ? allReports : allReports.filter((row) => row.status === active);

  return (
    <AppShell>
      <ScreenHeader title="Content Reports" subtitle="Interne Moderations-Queue" />

      <Card className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        {(["all", "open", "reviewing", "resolved", "rejected"] as Filter[]).map((status) => (
          <Link
            key={status}
            href={filterHref(status)}
            className={`rounded-full px-3 py-1 font-semibold ${
              active === status ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {status}
          </Link>
        ))}
      </Card>

      <div className="space-y-2 pb-24">
        {reports.length ? (
          reports.map((report) => (
            <Card key={report.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-900">
                  {report.target_type} · {report.target_id.slice(0, 16)}
                </p>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${BADGE[report.status]}`}>
                  {report.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-zinc-600">
                <p>Erstellt: {formatDateTime(report.created_at)}</p>
                <p>Reporter: {report.reporter_user_id.slice(0, 8)}...</p>
                {report.reviewed_at ? <p>Geprüft: {formatDateTime(report.reviewed_at)}</p> : null}
              </div>

              <p className="rounded-lg bg-zinc-100 px-2 py-1 text-xs text-zinc-700">Grund: {report.reason}</p>
              {report.details ? <p className="text-xs text-zinc-700">Details: {report.details}</p> : null}
              {report.review_note ? (
                <p className="rounded-lg bg-zinc-100 px-2 py-1 text-xs text-zinc-700">Notiz: {report.review_note}</p>
              ) : null}

              <form action={updateContentReportStatusAction} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="reportId" value={report.id} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    name="status"
                    defaultValue={report.status}
                    className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs"
                  >
                    <option value="open">open</option>
                    <option value="reviewing">reviewing</option>
                    <option value="resolved">resolved</option>
                    <option value="rejected">rejected</option>
                  </select>
                  <input
                    type="text"
                    name="reviewNote"
                    defaultValue={report.review_note ?? ""}
                    placeholder="Interne Notiz"
                    className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white"
                >
                  Speichern
                </button>
              </form>
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-sm text-zinc-500">Keine Meldungen vorhanden.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
