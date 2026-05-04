"use server";

import { revalidatePath } from "next/cache";
import { requireInternalAdmin } from "@/lib/admin-guard";
import { retryWebhookEventById } from "@/lib/stripe-webhook-processor";

export async function retryWebhookEventAction(formData: FormData): Promise<void> {
  await requireInternalAdmin();

  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) {
    return;
  }

  await retryWebhookEventById(eventId);
  revalidatePath("/host/webhooks");
}
