"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireInternalAdmin } from "@/lib/admin-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

export async function reviewPartySubmissionAction(formData: FormData): Promise<void> {
  await requireInternalAdmin();

  const partyId = String(formData.get("partyId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();

  if (!partyId || (decision !== "approve" && decision !== "reject")) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const nextStatus = decision === "approve" ? "published" : "cancelled";
  const nextReviewStatus = decision === "approve" ? "approved" : "rejected";

  let updateResult = await supabase
    .from("parties")
    .update({
      status: nextStatus,
      review_status: nextReviewStatus,
    })
    .eq("id", partyId)
    .select("id")
    .limit(1);

  if (isMissingColumnError(updateResult.error?.code)) {
    updateResult = await supabase
      .from("parties")
      .update({
        status: nextStatus,
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
  await requireInternalAdmin();

  const hangoutId = String(formData.get("hangoutId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();

  if (!hangoutId || (decision !== "approve" && decision !== "reject")) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const nextReviewStatus = decision === "approve" ? "approved" : "rejected";
  const nextStatus = decision === "approve" ? "published" : "rejected";

  let updateResult = await supabase
    .from("hangouts")
    .update({
      review_status: nextReviewStatus,
      status: nextStatus,
      is_published: decision === "approve",
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

  try {
    revalidatePath("/admin");
    revalidatePath("/discover");
  } catch (err) {
    console.warn("[reviewHangoutSubmissionAction] revalidate warning:", err);
  }

  redirect("/admin");
}
