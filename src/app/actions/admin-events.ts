"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireInternalAdmin } from "@/lib/admin-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

function isMissingRelationError(code: string | undefined) {
  return code === "42P01";
}

async function logModerationDecision(params: {
  entityType: "party" | "hangout";
  entityId: string;
  decision: "approve" | "reject";
  adminUserId: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("moderation_decisions").insert({
    entity_type: params.entityType,
    entity_id: params.entityId,
    decision: params.decision,
    reviewed_by: params.adminUserId,
  });

  if (error && !isMissingRelationError(error.code)) {
    console.warn("[moderation_decisions] Failed to write moderation log:", error);
  }
}

export async function reviewPartySubmissionAction(formData: FormData): Promise<void> {
  const adminUser = await requireInternalAdmin();

  const partyId = String(formData.get("partyId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();

  if (!partyId || (decision !== "approve" && decision !== "reject")) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const nextStatus = decision === "approve" ? "published" : "cancelled";
  const nextReviewStatus = decision === "approve" ? "approved" : "rejected";
  const reviewedAt = new Date().toISOString();

  let updateResult = await supabase
    .from("parties")
    .update({
      status: nextStatus,
      review_status: nextReviewStatus,
      is_published: decision === "approve",
      reviewed_at: reviewedAt,
      reviewed_by: adminUser.id,
    })
    .eq("id", partyId)
    .select("id")
    .limit(1);

  if (isMissingColumnError(updateResult.error?.code)) {
    updateResult = await supabase
      .from("parties")
      .update({
        status: nextStatus,
        review_status: nextReviewStatus,
        is_published: decision === "approve",
      })
      .eq("id", partyId)
      .select("id")
      .limit(1);
  }

  if (isMissingColumnError(updateResult.error?.code)) {
    updateResult = await supabase
      .from("parties")
      .update({
        is_published: decision === "approve",
        review_status: nextReviewStatus,
      })
      .eq("id", partyId)
      .select("id")
      .limit(1);
  }

  if (isMissingColumnError(updateResult.error?.code)) {
    updateResult = await supabase
      .from("parties")
      .update({
        is_published: decision === "approve",
      })
      .eq("id", partyId)
      .select("id")
      .limit(1);
  }

  const error = updateResult.error;
  const updatedRows = Array.isArray(updateResult.data) ? updateResult.data.length : 0;

  if (error) {
    console.error("[reviewPartySubmissionAction] Failed to review party:", error);
    return;
  }

  if (updatedRows === 0) {
    console.error("[reviewPartySubmissionAction] No row updated for party:", partyId);
    return;
  }

  await logModerationDecision({
    entityType: "party",
    entityId: partyId,
    decision: decision as "approve" | "reject",
    adminUserId: adminUser.id,
  });

  try {
    revalidatePath("/admin");
    revalidatePath("/discover");
    revalidatePath("/host");
  } catch (err) {
    console.warn("[reviewPartySubmissionAction] revalidate warning:", err);
  }

  redirect("/admin");
}

export async function reviewHangoutSubmissionAction(formData: FormData): Promise<void> {
  const adminUser = await requireInternalAdmin();

  const hangoutId = String(formData.get("hangoutId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();

  if (!hangoutId || (decision !== "approve" && decision !== "reject")) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const nextReviewStatus = decision === "approve" ? "approved" : "rejected";
  const nextStatus = decision === "approve" ? "published" : "rejected";
  const reviewedAt = new Date().toISOString();

  let updateResult = await supabase
    .from("hangouts")
    .update({
      review_status: nextReviewStatus,
      status: nextStatus,
      is_published: decision === "approve",
      reviewed_at: reviewedAt,
      reviewed_by: adminUser.id,
    })
    .eq("id", hangoutId)
    .select("id")
    .limit(1);

  if (isMissingColumnError(updateResult.error?.code)) {
    updateResult = await supabase
      .from("hangouts")
      .update({
        review_status: nextReviewStatus,
        is_published: decision === "approve",
      })
      .eq("id", hangoutId)
      .select("id")
      .limit(1);
  }

  if (isMissingColumnError(updateResult.error?.code)) {
    updateResult = await supabase
      .from("hangouts")
      .update({
        status: nextStatus,
        is_published: decision === "approve",
      })
      .eq("id", hangoutId)
      .select("id")
      .limit(1);
  }

  if (isMissingColumnError(updateResult.error?.code)) {
    updateResult = await supabase
      .from("hangouts")
      .update({
        is_published: decision === "approve",
      })
      .eq("id", hangoutId)
      .select("id")
      .limit(1);
  }

  const updateError = updateResult.error;
  const updatedRows = Array.isArray(updateResult.data) ? updateResult.data.length : 0;

  if (updateError) {
    console.error("[reviewHangoutSubmissionAction] Failed to review hangout:", updateError);
    return;
  }

  if (updatedRows === 0) {
    console.error("[reviewHangoutSubmissionAction] No row updated for hangout:", hangoutId);
    return;
  }

  await logModerationDecision({
    entityType: "hangout",
    entityId: hangoutId,
    decision: decision as "approve" | "reject",
    adminUserId: adminUser.id,
  });

  try {
    revalidatePath("/admin");
    revalidatePath("/discover");
  } catch (err) {
    console.warn("[reviewHangoutSubmissionAction] revalidate warning:", err);
  }

  redirect("/admin");
}
