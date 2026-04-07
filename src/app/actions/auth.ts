"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminKey, hasSupabaseEnv } from "@/lib/env";
import {
  sendEmailConfirmationMail,
  sendPasswordResetMail,
  sendWelcomeMail,
} from "@/lib/resend";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ActionState = {
  error?: string;
  success?: string;
};

function isAllowedMail(email: string) {
  return /^[a-z0-9._%+\-]+@student\.uni-tuebingen\.de$/i.test(email);
}

type ProfileVisibility = "public" | "members" | "hidden";
type Gender = "female" | "male" | "diverse";

function parseOptionalGender(value: FormDataEntryValue | null): Gender | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "female" || raw === "male" || raw === "diverse") {
    return raw;
  }
  return null;
}

function parseOptionalAge(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const age = Number(raw);
  if (!Number.isInteger(age) || age < 16 || age > 99) {
    return null;
  }

  return age;
}

function parseOptionalStudyProgram(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  return raw.slice(0, 120);
}

function getFileExtension(mimeType: string): string | null {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return null;
}

async function uploadAvatarForUser(userId: string, avatarFile: File): Promise<string> {
  const admin = getSupabaseAdmin();
  const fileExtension = getFileExtension(avatarFile.type);
  if (!fileExtension) {
    throw new Error("Avatar muss JPG, PNG oder WEBP sein.");
  }

  if (avatarFile.size > 3 * 1024 * 1024) {
    throw new Error("Avatar darf maximal 3MB groß sein.");
  }

  const filePath = `${userId}/avatar.${fileExtension}`;
  const bytes = new Uint8Array(await avatarFile.arrayBuffer());

  const upload = await admin.storage.from("avatars").upload(filePath, bytes, {
    contentType: avatarFile.type,
    upsert: true,
    cacheControl: "3600",
  });

  if (upload.error) {
    throw new Error(upload.error.message || "Avatar-Upload fehlgeschlagen.");
  }

  const { data } = admin.storage.from("avatars").getPublicUrl(filePath);
  return data.publicUrl;
}

async function upsertUserProfile(
  userId: string,
  payload: {
    displayName: string;
    gender: Gender | null;
    age: number | null;
    studyProgram: string | null;
    profileVisibility: ProfileVisibility;
    avatarUrl: string | null;
  },
) {
  try {
    const admin = getSupabaseAdmin();
    const profilesTable = admin.from("user_profiles") as unknown as {
      upsert: (values: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
    };
    const { error } = await profilesTable.upsert({
      id: userId,
      display_name: payload.displayName,
      gender: payload.gender,
      age: payload.age,
      study_program: payload.studyProgram,
      profile_visibility: payload.profileVisibility,
      avatar_url: payload.avatarUrl,
    });

    if (error) {
      console.error("[signUpAction] user_profiles upsert failed:", error);
    }
  } catch (error) {
    console.error("[signUpAction] user_profiles upsert exception:", error);
  }
}

export async function signUpAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const signUpEnabled = process.env.NEXT_PUBLIC_SIGNUP_ENABLED === "true";
  if (!signUpEnabled) {
    void formData;
    return {
      error: "Kontoerstellung ist vorübergehend pausiert. Stay tuned - dieses Feature kommt später.",
    };
  }

  if (!hasSupabaseEnv()) {
    return { error: "Supabase ist noch nicht konfiguriert (.env.local)." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const gender = parseOptionalGender(formData.get("gender"));
  const ageInput = String(formData.get("age") ?? "").trim();
  const age = parseOptionalAge(formData.get("age"));
  const studyProgram = parseOptionalStudyProgram(formData.get("studyProgram"));
  const avatarEntry = formData.get("avatar");
  const avatarFile = avatarEntry instanceof File && avatarEntry.size > 0 ? avatarEntry : null;

  if (ageInput && age === null) {
    return { error: "Alter muss zwischen 16 und 99 liegen." };
  }

  if (!isAllowedMail(email)) {
    return {
      error:
        "Bitte nutze deine Uni-Mail mit @student.uni-tuebingen.de.",
    };
  }

  if (password.length < 8) {
    return { error: "Passwort muss mindestens 8 Zeichen lang sein." };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const profileVisibility: ProfileVisibility = "members";
  const profileData = {
    display_name: displayName || email.split("@")[0],
    gender,
    age,
    study_program: studyProgram,
    profile_visibility: profileVisibility,
  };

  // Preferred path: create signup link and deliver with Resend templates.
  if (process.env.RESEND_API_KEY && getSupabaseAdminKey()) {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const generated = await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: {
          redirectTo: appUrl,
          data: profileData,
        },
      });

      if (generated.error) {
        return { error: generated.error.message };
      }

      const confirmationUrl = generated.data.properties?.action_link;
      if (!confirmationUrl) {
        return { error: "Bestätigungslink konnte nicht erstellt werden." };
      }

      const generatedUserId = generated.data.user?.id;
      let avatarUrl: string | null = null;

      if (generatedUserId && avatarFile) {
        avatarUrl = await uploadAvatarForUser(generatedUserId, avatarFile);
      }

      if (generatedUserId) {
        await upsertUserProfile(generatedUserId, {
          displayName: displayName || email.split("@")[0],
          gender,
          age,
          studyProgram,
          profileVisibility,
          avatarUrl,
        });
      }

      await sendEmailConfirmationMail(email, confirmationUrl, displayName);

      return {
        success: "Account erstellt. Bitte bestätige deine E-Mail über den Link in deinem Postfach.",
      };
    } catch {
      // Fallback to default Supabase signup flow below.
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: appUrl,
      data: profileData,
    },
  });

  if (error) {
    return { error: error.message };
  }

  let avatarUrl: string | null = null;
  if (data.user?.id && avatarFile) {
    try {
      avatarUrl = await uploadAvatarForUser(data.user.id, avatarFile);
    } catch (uploadError) {
      return {
        error:
          uploadError instanceof Error
            ? uploadError.message
            : "Avatar konnte nicht hochgeladen werden.",
      };
    }
  }

  if (data.user?.id) {
    await upsertUserProfile(data.user.id, {
      displayName: displayName || email.split("@")[0],
      gender,
      age,
      studyProgram,
      profileVisibility,
      avatarUrl,
    });
  }

  await sendWelcomeMail(email, displayName);

  return {
    success:
      "Account erstellt. Falls E-Mail-Bestätigung aktiv ist, prüfe dein Postfach.",
  };
}

export async function signInAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabaseEnv()) {
    return { error: "Supabase ist noch nicht konfiguriert (.env.local)." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const requestedRedirect = String(formData.get("redirectTo") ?? "").trim();
  const redirectTarget = requestedRedirect.startsWith("/") ? requestedRedirect : "/discover";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  redirect(redirectTarget);
}

export async function requestPasswordResetAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabaseEnv()) {
    return { error: "Supabase ist noch nicht konfiguriert (.env.local)." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!isAllowedMail(email)) {
    return {
      error:
        "Bitte nutze deine Uni-Mail mit @student.uni-tuebingen.de.",
    };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  if (process.env.RESEND_API_KEY && getSupabaseAdminKey()) {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const generated = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${appUrl}/reset-password`,
        },
      });

      if (!generated.error && generated.data.properties?.action_link) {
        await sendPasswordResetMail(email, generated.data.properties.action_link);
        return {
          success: "Wenn die Mail existiert, wurde ein Reset-Link gesendet.",
        };
      }
    } catch {
      // Fallback to default Supabase email flow below.
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Wenn die Mail existiert, wurde ein Reset-Link gesendet.",
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
