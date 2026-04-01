"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { requireInternalAdmin } from "@/lib/admin-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function adminRedirectWithStatus(params: {
  type: "success" | "error";
  scope: "party" | "hangout";
  decision: "approve" | "reject";
  message: string;
}) {
  const searchParams = new URLSearchParams({
    type: params.type,
    scope: params.scope,
    decision: params.decision,
    message: params.message,
  });

  redirect(`/admin?${searchParams.toString()}`);
}

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

  try {
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
      adminRedirectWithStatus({
        type: "error",
        scope: "party",
        decision: decision as "approve" | "reject",
        message: "Party konnte nicht moderiert werden.",
      });
    }

    if (updatedRows === 0) {
      console.error("[reviewPartySubmissionAction] No row updated for party:", partyId);
      adminRedirectWithStatus({
        type: "error",
        scope: "party",
        decision: decision as "approve" | "reject",
        message: "Keine Party wurde aktualisiert.",
      });
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

    adminRedirectWithStatus({
      type: "success",
      scope: "party",
      decision: decision as "approve" | "reject",
      message: decision === "approve" ? "Party wurde freigegeben." : "Party wurde abgelehnt.",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[reviewPartySubmissionAction] Unexpected failure:", error);
    adminRedirectWithStatus({
      type: "error",
      scope: "party",
      decision: decision as "approve" | "reject",
      message: "Moderation ist derzeit nicht verfuegbar. Pruefe SUPABASE_SERVICE_ROLE_KEY.",
    });
  }
}

export async function reviewHangoutSubmissionAction(formData: FormData): Promise<void> {
  const adminUser = await requireInternalAdmin();

  const hangoutId = String(formData.get("hangoutId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();

  if (!hangoutId || (decision !== "approve" && decision !== "reject")) {
    return;
  }

  try {
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
      adminRedirectWithStatus({
        type: "error",
        scope: "hangout",
        decision: decision as "approve" | "reject",
        message: "Community-Event konnte nicht moderiert werden.",
      });
    }

    if (updatedRows === 0) {
      console.error("[reviewHangoutSubmissionAction] No row updated for hangout:", hangoutId);
      adminRedirectWithStatus({
        type: "error",
        scope: "hangout",
        decision: decision as "approve" | "reject",
        message: "Kein Community-Event wurde aktualisiert.",
      });
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

    adminRedirectWithStatus({
      type: "success",
      scope: "hangout",
      decision: decision as "approve" | "reject",
      message:
        decision === "approve"
          ? "Community-Event wurde freigegeben."
          : "Community-Event wurde abgelehnt.",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[reviewHangoutSubmissionAction] Unexpected failure:", error);
    adminRedirectWithStatus({
      type: "error",
      scope: "hangout",
      decision: decision as "approve" | "reject",
      message: "Moderation ist derzeit nicht verfuegbar. Pruefe SUPABASE_SERVICE_ROLE_KEY.",
    });
  }
}

export async function deletePartySubmissionAction(formData: FormData): Promise<void> {
  await requireInternalAdmin();

  const partyId = String(formData.get("partyId") ?? "").trim();
  if (!partyId) {
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const deleteResult = await supabase.from("parties").delete().eq("id", partyId).select("id").limit(1);

    const deleteError = deleteResult.error;
    const deletedRows = Array.isArray(deleteResult.data) ? deleteResult.data.length : 0;

    if (deleteError) {
      console.error("[deletePartySubmissionAction] Failed to delete party:", deleteError);
      adminRedirectWithStatus({
        type: "error",
        scope: "party",
        decision: "reject",
        message: "Party konnte nicht geloescht werden.",
      });
    }

    if (deletedRows === 0) {
      console.error("[deletePartySubmissionAction] No row deleted for party:", partyId);
      adminRedirectWithStatus({
        type: "error",
        scope: "party",
        decision: "reject",
        message: "Keine Party wurde geloescht.",
      });
    }

    try {
      revalidatePath("/admin");
      revalidatePath("/discover");
      revalidatePath("/host");
    } catch (err) {
      console.warn("[deletePartySubmissionAction] revalidate warning:", err);
    }

    adminRedirectWithStatus({
      type: "success",
      scope: "party",
      decision: "reject",
      message: "Party wurde geloescht.",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[deletePartySubmissionAction] Unexpected failure:", error);
    adminRedirectWithStatus({
      type: "error",
      scope: "party",
      decision: "reject",
      message: "Loeschen ist derzeit nicht verfuegbar.",
    });
  }
}

export async function deleteHangoutSubmissionAction(formData: FormData): Promise<void> {
  await requireInternalAdmin();

  const hangoutId = String(formData.get("hangoutId") ?? "").trim();
  if (!hangoutId) {
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const deleteResult = await supabase.from("hangouts").delete().eq("id", hangoutId).select("id").limit(1);

    const deleteError = deleteResult.error;
    const deletedRows = Array.isArray(deleteResult.data) ? deleteResult.data.length : 0;

    if (deleteError) {
      console.error("[deleteHangoutSubmissionAction] Failed to delete hangout:", deleteError);
      adminRedirectWithStatus({
        type: "error",
        scope: "hangout",
        decision: "reject",
        message: "Community-Event konnte nicht geloescht werden.",
      });
    }

    if (deletedRows === 0) {
      console.error("[deleteHangoutSubmissionAction] No row deleted for hangout:", hangoutId);
      adminRedirectWithStatus({
        type: "error",
        scope: "hangout",
        decision: "reject",
        message: "Kein Community-Event wurde geloescht.",
      });
    }

    try {
      revalidatePath("/admin");
      revalidatePath("/discover");
    } catch (err) {
      console.warn("[deleteHangoutSubmissionAction] revalidate warning:", err);
    }

    adminRedirectWithStatus({
      type: "success",
      scope: "hangout",
      decision: "reject",
      message: "Community-Event wurde geloescht.",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[deleteHangoutSubmissionAction] Unexpected failure:", error);
    adminRedirectWithStatus({
      type: "error",
      scope: "hangout",
      decision: "reject",
      message: "Loeschen ist derzeit nicht verfuegbar.",
    });
  }
}
