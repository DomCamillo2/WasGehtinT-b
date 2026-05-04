import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type HostReportStatus = "open" | "reviewing" | "resolved" | "rejected";
export type HostReportsFilter = "all" | HostReportStatus;

type HostReportDbRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string;
  status: HostReportStatus;
  created_at: string;
  reporter_user_id: string;
  review_note: string | null;
  reviewed_at: string | null;
};

export type HostReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string;
  status: HostReportStatus;
  createdAt: string;
  reporterUserId: string;
  reviewNote: string | null;
  reviewedAt: string | null;
};

export async function loadHostReports(filter: HostReportsFilter): Promise<HostReportRow[]> {
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

  const allReports = ((data ?? []) as HostReportDbRow[]).map((row) => ({
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: row.created_at,
    reporterUserId: row.reporter_user_id,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
  }));

  return filter === "all" ? allReports : allReports.filter((row) => row.status === filter);
}