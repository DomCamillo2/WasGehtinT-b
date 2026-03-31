"use server";

import { revalidatePath } from "next/cache";
import { requireInternalAdmin } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase
    .from("parties")
    .update({
      status: nextStatus,
      review_status: nextReviewStatus,
    })
    .eq("id", partyId);

  if (error) {
    console.error("[reviewPartySubmissionAction] Failed to review party:", error);
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/discover");
  revalidatePath("/host");
}
