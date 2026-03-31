"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { moderateContent } from "@/lib/moderation";

export type HangoutActionState = {
  error?: string;
  success?: string;
};

const initialState: HangoutActionState = {};

type AdminHangoutInsertClient = {
  from: (table: "hangouts") => {
    insert: (values: Record<string, unknown>) => Promise<{ error: { code?: string } | null }>;
  };
};

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

export async function createHangoutAction(
  prevState: HangoutActionState = initialState,
  formData: FormData,
): Promise<HangoutActionState> {
  void prevState;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const submitterNameRaw = String(formData.get("submitterName") ?? "").trim();
  const submitterName = submitterNameRaw.slice(0, 80);

  if (!user && !submitterName) {
    return { error: "Bitte gib einen Namen an, wenn du ohne Account einreichst." };
  }

  if (user) {
    // Keep legacy accounts compatible where no profile row exists yet.
    await supabase.from("user_profiles").upsert({ id: user.id });
  }

  const titleRaw = String(formData.get("title") ?? "").trim();
  const locationRaw = String(formData.get("locationText") ?? "").trim();
  const meetupAtRaw = String(formData.get("meetupAt") ?? "").trim();
  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const activityType = String(formData.get("activityType") ?? "other").trim();

  if (!titleRaw || !locationRaw || !meetupAtRaw || !descriptionRaw) {
    return { error: "Bitte Titel, Wo, Wann und Beschreibung ausfüllen." };
  }

  if (titleRaw.length > 120) {
    return { error: "Titel ist zu lang (max. 120 Zeichen)." };
  }

  if (descriptionRaw.length > 600) {
    return { error: "Beschreibung ist zu lang (max. 600 Zeichen)." };
  }

  if (locationRaw.length > 160) {
    return { error: "Ort ist zu lang (max. 160 Zeichen)." };
  }

  const meetupAtDate = new Date(meetupAtRaw);
  if (Number.isNaN(meetupAtDate.getTime())) {
    return { error: "Bitte eine gültige Uhrzeit auswählen." };
  }

  const allowedTypes = new Set(["sport", "chill", "party", "meetup", "other"]);
  const safeType = allowedTypes.has(activityType) ? activityType : "other";

  const titleModeration = moderateContent(titleRaw);
  if (titleModeration.isBlocked) {
    return { error: titleModeration.message };
  }

  const descriptionModeration = moderateContent(descriptionRaw);
  if (descriptionModeration.isBlocked) {
    return { error: descriptionModeration.message };
  }

  const admin = getSupabaseAdmin();
  const adminHangouts = admin as unknown as AdminHangoutInsertClient;
  const baseInsert = {
    user_id: user?.id ?? null,
    title: titleModeration.sanitizedText,
    description: descriptionModeration.sanitizedText,
    activity_type: safeType,
    location_text: locationRaw,
    meetup_at: meetupAtDate.toISOString(),
    review_status: "pending",
    status: "pending",
    is_published: false,
    submitter_name: submitterName || null,
  };

  let insertResult = await adminHangouts.from("hangouts").insert(baseInsert);

  if (isMissingColumnError(insertResult.error?.code)) {
    insertResult = await adminHangouts.from("hangouts").insert({
      ...baseInsert,
      submitter_name: undefined,
      is_published: undefined,
      status: undefined,
    });
  }

  if (isMissingColumnError(insertResult.error?.code)) {
    // Backward-compatible fallback while the new migration is not applied yet.
    const legacyDescription = `Wo: ${locationRaw}\nWann: ${meetupAtDate.toISOString()}\n\n${descriptionModeration.sanitizedText}`;
    insertResult = await adminHangouts.from("hangouts").insert({
      user_id: user?.id ?? null,
      title: titleModeration.sanitizedText,
      description: legacyDescription,
      activity_type: safeType,
      review_status: "pending",
      status: "pending",
      is_published: false,
      submitter_name: submitterName || null,
    });
  }

  if (isMissingColumnError(insertResult.error?.code)) {
    insertResult = await adminHangouts.from("hangouts").insert({
      user_id: user?.id ?? null,
      title: titleModeration.sanitizedText,
      description: `Einreichung: ${submitterName || "Gast"}\nWo: ${locationRaw}\nWann: ${meetupAtDate.toISOString()}\n\n${descriptionModeration.sanitizedText}`,
      activity_type: safeType,
    });
  }

  const error = insertResult.error;

  if (error) {
    return { error: "Posten fehlgeschlagen. Bitte versuche es erneut." };
  }

  revalidatePath("/spontan");

  if (titleModeration.wasSanitized || descriptionModeration.wasSanitized) {
    return { success: "Eingereicht. Einige Wörter wurden automatisch zensiert und der Post wird nach Admin-Review sichtbar." };
  }

  return { success: "Eingereicht. Sichtbar nach Admin-Freigabe." };
}
