"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type ActionState = {
  error?: string;
  success?: string;
};

function isAllowedMail(email: string) {
  return /^[a-z0-9._%+\-]+@student\.uni-tuebingen\.de$/i.test(email);
}

export async function signUpAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!hasSupabaseEnv()) {
    return { error: "Supabase ist noch nicht konfiguriert (.env.local)." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!isAllowedMail(email)) {
    return {
      error:
        "Bitte nutze deine Uni-Mail mit @student.uni-tuebingen.de.",
    };
  }

  if (password.length < 8) {
    return { error: "Passwort muss mindestens 8 Zeichen lang sein." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split("@")[0] },
    },
  });

  if (error) {
    return { error: error.message };
  }

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/discover");
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
