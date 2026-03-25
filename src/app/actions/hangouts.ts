"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { moderateContent } from "@/lib/moderation";

export type HangoutActionState = {
  error?: string;
  success?: string;
};

const initialState: HangoutActionState = {};

export async function createHangoutAction(
  prevState: HangoutActionState = initialState,
  formData: FormData,
): Promise<HangoutActionState> {
  void prevState;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bitte logge dich ein." };
  }

  const titleRaw = String(formData.get("title") ?? "").trim();
  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const activityType = String(formData.get("activityType") ?? "other").trim();

  if (!titleRaw || !descriptionRaw) {
    return { error: "Bitte Titel und Beschreibung ausfüllen." };
  }

  if (titleRaw.length > 120) {
    return { error: "Titel ist zu lang (max. 120 Zeichen)." };
  }

  if (descriptionRaw.length > 600) {
    return { error: "Beschreibung ist zu lang (max. 600 Zeichen)." };
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

  const { error } = await supabase.from("hangouts").insert({
    user_id: user.id,
    title: titleModeration.sanitizedText,
    description: descriptionModeration.sanitizedText,
    activity_type: safeType,
  });

  if (error) {
    return { error: "Posten fehlgeschlagen. Bitte versuche es erneut." };
  }

  revalidatePath("/spontan");

  if (titleModeration.wasSanitized || descriptionModeration.wasSanitized) {
    return { success: "Gepostet. Einige Wörter wurden automatisch zensiert." };
  }

  return { success: "Gepostet!" };
}
