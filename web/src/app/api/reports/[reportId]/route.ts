import { NextResponse } from "next/server";
import { getInternalAdminUserOrNull } from "@/lib/admin-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_STATUSES = new Set(["open", "reviewing", "resolved", "rejected"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const admin = await getInternalAdminUserOrNull();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { reportId } = await params;
  const safeReportId = String(reportId ?? "").trim();
  if (!safeReportId) {
    return NextResponse.json({ ok: false, error: "invalid_report_id" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        status?: string;
        reviewNote?: string;
      }
    | null;

  if (!payload) {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const status = String(payload.status ?? "").trim();
  const reviewNote = String(payload.reviewNote ?? "").trim();

  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin() as unknown as {
    from: (table: string) => {
      update: (row: Record<string, unknown>) => {
        eq: (column: string, value: string) => Promise<{ error: { message?: string } | null }>;
      };
    };
  };

  const { error } = await supabaseAdmin
    .from("content_reports")
    .update({
      status,
      review_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", safeReportId);

  if (error) {
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
