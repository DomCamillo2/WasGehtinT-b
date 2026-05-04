"use server";

import { revalidatePath } from "next/cache";
import { requireInternalAdmin } from "@/lib/admin-guard";
import { moderateContent } from "@/lib/moderation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ReportActionState = {
  error?: string;
  success?: string;
};

const initialState: ReportActionState = {};

const ALLOWED_TARGET_TYPES = new Set(["chat", "spontan", "party", "other"]);

export async function submitContentReportAction(
  prevState: ReportActionState = initialState,
  formData: FormData,
): Promise<ReportActionState> {
  void prevState;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bitte logge dich ein, um einen Beitrag zu melden." };
  }

  const targetTypeRaw = String(formData.get("type") ?? "other").trim().toLowerCase();
  const targetType = ALLOWED_TARGET_TYPES.has(targetTypeRaw) ? targetTypeRaw : "other";
  const targetId = String(formData.get("targetId") ?? "").trim();
  const reasonRaw = String(formData.get("reason") ?? "").trim();
  const detailsRaw = String(formData.get("details") ?? "").trim();

  if (!targetId) {
    return { error: "Ungültige Referenz. Bitte rufe die Melde-Seite neu auf." };
  }

  if (!reasonRaw || reasonRaw.length < 4 || reasonRaw.length > 160) {
    return { error: "Bitte gib einen Grund mit 4 bis 160 Zeichen an." };
  }

  if (detailsRaw.length > 2000) {
    return { error: "Details sind zu lang (max. 2000 Zeichen)." };
  }

  const reasonModeration = moderateContent(reasonRaw);
  const detailsModeration = moderateContent(detailsRaw);
  if (reasonModeration.isBlocked || detailsModeration.isBlocked) {
    return { error: "Die Meldung enthält unzulässige Inhalte. Bitte formuliere sie neutral." };
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
    return { error: "Meldung konnte nicht gespeichert werden. Bitte versuche es erneut." };
  }

  revalidatePath("/melden");

  if (reasonModeration.wasSanitized || detailsModeration.wasSanitized) {
    return { success: "Meldung gespeichert. Einzelne Wörter wurden automatisch zensiert." };
  }

  return { success: "Danke, deine Meldung wurde gespeichert." };
}

export async function updateContentReportStatusAction(formData: FormData): Promise<void> {
  const adminUser = await requireInternalAdmin();

  const reportId = String(formData.get("reportId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  const allowedStatuses = new Set(["open", "reviewing", "resolved", "rejected"]);

  if (!reportId || !allowedStatuses.has(status)) {
    return;
  }

  const supabaseAdmin = getSupabaseAdmin() as unknown as {
    from: (table: string) => {
      update: (row: Record<string, unknown>) => { eq: (column: string, value: string) => Promise<unknown> };
    };
  };

  await supabaseAdmin
    .from("content_reports")
    .update({
      status,
      review_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  revalidatePath("/host/reports");
}
