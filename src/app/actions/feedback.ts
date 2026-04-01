"use server";

import { revalidatePath } from "next/cache";
import { moderateContent } from "@/lib/moderation";
import { requireInternalAdmin } from "@/lib/admin-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FeedbackActionState = {
  error?: string;
  success?: string;
};

const initialState: FeedbackActionState = {};
const ALLOWED_FEEDBACK_TYPES = new Set(["feedback", "feature_request"]);
const ALLOWED_FEEDBACK_STATUSES = new Set(["open", "reviewing", "planned", "closed"]);

export async function submitFeedbackAction(
  prevState: FeedbackActionState = initialState,
  formData: FormData,
): Promise<FeedbackActionState> {
  void prevState;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const typeRaw = String(formData.get("type") ?? "feedback").trim().toLowerCase();
  const type = ALLOWED_FEEDBACK_TYPES.has(typeRaw) ? typeRaw : "feedback";
  const titleRaw = String(formData.get("title") ?? "").trim();
  const messageRaw = String(formData.get("message") ?? "").trim();
  const contactEmailRaw = String(formData.get("contactEmail") ?? "").trim();

  if (titleRaw.length < 4 || titleRaw.length > 120) {
    return { error: "Bitte gib einen Titel mit 4 bis 120 Zeichen an." };
  }

  if (messageRaw.length < 10 || messageRaw.length > 2000) {
    return { error: "Bitte beschreibe dein Anliegen mit 10 bis 2000 Zeichen." };
  }

  if (contactEmailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmailRaw)) {
    return { error: "Bitte gib eine gueltige E-Mail-Adresse an oder lasse das Feld leer." };
  }

  const titleModeration = moderateContent(titleRaw);
  const messageModeration = moderateContent(messageRaw);
  if (titleModeration.isBlocked || messageModeration.isBlocked) {
    return { error: "Dein Text enthaelt unzulaessige Inhalte. Bitte formuliere ihn neutral." };
  }

  const feedbackClient = supabase as unknown as {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
    };
  };

  const { error } = await feedbackClient.from("feedback_entries").insert({
    user_id: user?.id ?? null,
    contact_email: contactEmailRaw || user?.email || null,
    type,
    title: titleModeration.sanitizedText,
    message: messageModeration.sanitizedText,
    status: "open",
  });

  if (error) {
    console.error("[submitFeedbackAction] Failed to insert feedback:", error);
    return { error: "Feedback konnte nicht gespeichert werden. Bitte versuche es erneut." };
  }

  revalidatePath("/feedback");
  revalidatePath("/admin");

  if (titleModeration.wasSanitized || messageModeration.wasSanitized) {
    return { success: "Danke. Dein Eintrag wurde gespeichert, einzelne Woerter wurden automatisch zensiert." };
  }

  return {
    success:
      type === "feature_request"
        ? "Danke. Dein Feature-Wunsch ist eingegangen."
        : "Danke fuer dein Feedback. Es ist im Admin-Panel sichtbar.",
  };
}

export async function updateFeedbackStatusAction(formData: FormData): Promise<void> {
  const adminUser = await requireInternalAdmin();

  const feedbackId = String(formData.get("feedbackId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const adminNote = String(formData.get("adminNote") ?? "").trim();

  if (!feedbackId || !ALLOWED_FEEDBACK_STATUSES.has(status)) {
    return;
  }

  const supabaseAdmin = getSupabaseAdmin() as unknown as {
    from: (table: string) => {
      update: (row: Record<string, unknown>) => { eq: (column: string, value: string) => Promise<unknown> };
    };
  };

  await supabaseAdmin
    .from("feedback_entries")
    .update({
      status,
      admin_note: adminNote || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", feedbackId);

  revalidatePath("/admin");
}
