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

  try {
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
      await supabase.from("user_profiles").upsert({ id: user.id });
    }

    const titleRaw = String(formData.get("title") ?? "").trim();
    const locationRaw = String(formData.get("locationText") ?? "").trim();
    const meetupAtRaw = String(formData.get("meetupAt") ?? "").trim();
    const descriptionRaw = String(formData.get("description") ?? "").trim();

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

    const titleModeration = moderateContent(titleRaw);
    if (titleModeration.isBlocked) {
      return { error: titleModeration.message };
    }

    const descriptionModeration = moderateContent(descriptionRaw);
    if (descriptionModeration.isBlocked) {
      return { error: descriptionModeration.message };
    }

    // Public submissions should use the regular server client and RLS policies.
    const { error: insertError } = await supabase
      .from("hangouts")
      .insert({
        user_id: user?.id ?? null,
        submitter_name: submitterName || null,
        title: titleModeration.sanitizedText,
        description: descriptionModeration.sanitizedText,
        location_text: locationRaw,
        meetup_at: meetupAtDate.toISOString(),
        review_status: "pending",
        status: "pending",
        is_published: false,
      });

    if (insertError) {
      console.error("[createHangoutAction] insert failed:", insertError);
      return { error: `Posten fehlgeschlagen (${insertError.code ?? "unknown"}). Bitte versuche es erneut.` };
    }

    // Clear caches
    try {
      revalidatePath("/admin");
      revalidatePath("/discover");
    } catch (err) {
      console.warn("[createHangoutAction] revalidate warning:", err);
    }

    if (titleModeration.wasSanitized || descriptionModeration.wasSanitized) {
      return {
        success:
          "Eingereicht. Einige Wörter wurden automatisch zensiert und der Eintrag wird nach Admin-Review sichtbar.",
      };
    }

    return { success: "Eingereicht. Zur Freigabe eingesendet." };
  } catch (error) {
    console.error("[createHangoutAction] submit failed", error);
    return { error: "Einreichen fehlgeschlagen. Bitte versuche es erneut." };
  }
}
