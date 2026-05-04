"use client";

import { createClient } from "@/lib/supabase/client";

type UpdatePasswordResult =
  | { ok: true }
  | { ok: false; message: string };

export async function updateCurrentUserPassword(password: string): Promise<UpdatePasswordResult> {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      ok: false,
      message: error.message || "Passwort konnte nicht aktualisiert werden.",
    };
  }

  return { ok: true };
}