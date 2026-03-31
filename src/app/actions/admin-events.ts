"use server";

import { revalidatePath } from "next/cache";
import { requireInternalAdmin } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const nextStatus = decision === "approve" ? "published" : "cancelled";
  const nextReviewStatus = decision === "approve" ? "approved" : "rejected";

  let updateResult = await supabase
    .from("parties")
    .update({
      status: nextStatus,
      review_status: nextReviewStatus,
    })
    .eq("id", partyId);

  if (isMissingColumnError(updateResult.error?.code)) {
    updateResult = await supabase
      .from("parties")
      .update({
        status: nextStatus,
      })
      .eq("id", partyId);
  }

  if (isMissingColumnError(updateResult.error?.code)) {
    updateResult = await supabase
      .from("parties")
      .update({
        is_published: decision === "approve",
        review_status: nextReviewStatus,
      })
      .eq("id", partyId);
  }

  if (isMissingColumnError(updateResult.error?.code)) {
    updateResult = await supabase
      .from("parties")
      .update({
        is_published: decision === "approve",
      })
      .eq("id", partyId);
  }

  const error = updateResult.error;

  if (error) {
    console.error("[reviewPartySubmissionAction] Failed to review party:", error);
    return;
  }

  try {
    revalidatePath("/admin");
    revalidatePath("/discover");
    revalidatePath("/host");
  } catch (err) {
    console.warn("[reviewPartySubmissionAction] revalidate warning:", err);
  }
}

export async function reviewHangoutSubmissionAction(formData: FormData): Promise<void> {
  await requireInternalAdmin();

  const hangoutId = String(formData.get("hangoutId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();

  if (!hangoutId || (decision !== "approve" && decision !== "reject")) {
    return;
  }

  const supabase = await createClient();
  const nextReviewStatus = decision === "approve" ? "approved" : "rejected";
  const nextStatus = decision === "approve" ? "published" : "rejected";

  let updateResult = await supabase
    .from("hangouts")
    .update({
      review_status: nextReviewStatus,
      status: nextStatus,
      is_published: decision === "approve",
    })
    .eq("id", hangoutId);

  if (isMissingColumnError(updateResult.error?.code)) {
    updateResult = await supabase
      .from("hangouts")
      .update({
        review_status: nextReviewStatus,
        status: nextStatus,
      })
      .eq("id", hangoutId);
  }

  if (isMissingColumnError(updateResult.error?.code)) {
    updateResult = await supabase
      .from("hangouts")
      .update({
        is_published: decision === "approve",
      })
      .eq("id", hangoutId);
  }

  if (updateResult.error) {
    console.error("[reviewHangoutSubmissionAction] Failed to review hangout:", updateResult.error);
    return;
  }

  try {
    revalidatePath("/admin");
    revalidatePath("/discover");
  } catch (err) {
    console.warn("[reviewHangoutSubmissionAction] revalidate warning:", err);
  }
}
