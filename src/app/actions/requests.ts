"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createRequestAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const partyId = String(formData.get("partyId") ?? "");
  const groupSize = Number(formData.get("groupSize") ?? 1);
  const message = String(formData.get("message") ?? "").trim();

  if (!partyId) {
    return;
  }

  const { data: request, error } = await supabase
    .from("party_requests")
    .insert({
      party_id: partyId,
      requester_user_id: user.id,
      group_size: groupSize,
      message: message || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createRequestAction] Failed to create request:", error);
    return;
  }

  if (!request?.id) {
    return;
  }

  const selectedItems = formData
    .getAll("bringItemId")
    .map((value) => String(value))
    .filter(Boolean);

  if (selectedItems.length) {
    const rows = selectedItems.map((bringItemId) => ({
      party_request_id: request.id,
      bring_item_id: bringItemId,
      quantity_committed: 1,
    }));

    const { error: itemError } = await supabase
      .from("party_request_bring_items")
      .insert(rows);

    if (itemError) {
      console.error("[createRequestAction] Failed to insert bring items:", itemError);
      return;
    }
  }

  revalidatePath("/requests");
  revalidatePath("/discover");
}

export async function decideRequestAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (!requestId || !["accepted", "rejected"].includes(decision)) {
    return;
  }

  const { error } = await supabase
    .from("party_requests")
    .update({
      status: decision,
      decided_at: new Date().toISOString(),
      decided_by: user.id,
    })
    .eq("id", requestId);

  if (error) {
    console.error("[decideRequestAction] Failed to update request:", error);
    return;
  }

  revalidatePath("/host");
  revalidatePath("/chat");
  revalidatePath("/requests");
}
