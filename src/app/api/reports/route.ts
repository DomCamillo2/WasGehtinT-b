import { NextResponse } from "next/server";
import { getInternalAdminUserOrNull } from "@/lib/admin-guard";
import { moderateContent } from "@/lib/moderation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TARGET_TYPES = new Set(["chat", "spontan", "party", "other"]);
const ALLOWED_STATUSES = new Set(["open", "reviewing", "resolved", "rejected"]);

type QueryResult = Promise<{ data: unknown[] | null; error: { message?: string } | null }>;
type LimitBuilder = QueryResult & {
  eq: (column: string, value: string) => QueryResult;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        type?: string;
        targetId?: string;
        reason?: string;
        details?: string;
      }
    | null;

  if (!payload) {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const targetTypeRaw = String(payload.type ?? "other").trim().toLowerCase();
  const targetType = ALLOWED_TARGET_TYPES.has(targetTypeRaw) ? targetTypeRaw : "other";
  const targetId = String(payload.targetId ?? "").trim();
  const reasonRaw = String(payload.reason ?? "").trim();
  const detailsRaw = String(payload.details ?? "").trim();

  if (!targetId) {
    return NextResponse.json({ ok: false, error: "invalid_target" }, { status: 400 });
  }

  if (!reasonRaw || reasonRaw.length < 4 || reasonRaw.length > 160) {
    return NextResponse.json({ ok: false, error: "invalid_reason" }, { status: 400 });
  }

  if (detailsRaw.length > 2000) {
    return NextResponse.json({ ok: false, error: "details_too_long" }, { status: 400 });
  }

  const reasonModeration = moderateContent(reasonRaw);
  const detailsModeration = moderateContent(detailsRaw);
  if (reasonModeration.isBlocked || detailsModeration.isBlocked) {
    return NextResponse.json({ ok: false, error: "blocked_content" }, { status: 400 });
  }

  const reportsClient = supabase as unknown as {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
    };
  };

  const { error } = await reportsClient.from("content_reports").insert({
    reporter_user_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason: reasonModeration.sanitizedText,
    details: detailsModeration.sanitizedText,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(request: Request) {
  const admin = await getInternalAdminUserOrNull();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = String(url.searchParams.get("status") ?? "all").trim();
  const limit = Number(url.searchParams.get("limit") ?? "100");
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(300, Math.floor(limit))) : 100;

  const supabaseAdmin = getSupabaseAdmin() as unknown as {
    from: (table: string) => {
      select: (query: string) => {
        order: (column: string, args: { ascending: boolean }) => {
          limit: (count: number) => LimitBuilder;
        };
      };
    };
  };

  const baseQuery = supabaseAdmin
    .from("content_reports")
    .select("id, target_type, target_id, reason, details, status, created_at, reviewed_at, review_note, reporter_user_id, reviewed_by")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  const { data, error } = ALLOWED_STATUSES.has(status)
    ? await baseQuery.eq("status", status)
    : await baseQuery;

  if (error) {
    return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}
