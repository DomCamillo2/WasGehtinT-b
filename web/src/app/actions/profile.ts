"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ProfileVisibility = "public" | "members" | "hidden";
type Gender = "female" | "male" | "diverse";

function parseGender(value: FormDataEntryValue | null): Gender | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "female" || raw === "male" || raw === "diverse") {
    return raw;
  }
  return null;
}

function parseAge(value: FormDataEntryValue | null): number | null {
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

function parseVisibility(value: FormDataEntryValue | null): ProfileVisibility {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "public" || raw === "members" || raw === "hidden") {
    return raw;
  }
  return "members";
}

function getFileExtension(mimeType: string): string | null {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return null;
}

async function uploadAvatar(userId: string, avatarFile: File): Promise<string> {
  const admin = getSupabaseAdmin();
  const extension = getFileExtension(avatarFile.type);

  if (!extension) {
    throw new Error("Avatar muss JPG, PNG oder WEBP sein.");
  }

  if (avatarFile.size > 3 * 1024 * 1024) {
    throw new Error("Avatar darf maximal 3MB groß sein.");
  }

  const filePath = `${userId}/avatar.${extension}`;
  const bytes = new Uint8Array(await avatarFile.arrayBuffer());

  const upload = await admin.storage.from("avatars").upload(filePath, bytes, {
    contentType: avatarFile.type,
    upsert: true,
    cacheControl: "3600",
  });

  if (upload.error) {
    throw new Error(upload.error.message || "Avatar konnte nicht gespeichert werden.");
  }

  const { data } = admin.storage.from("avatars").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  if (displayName.length < 2) {
    redirect("/profile?error=display_name");
  }

  const ageRaw = String(formData.get("age") ?? "").trim();
  const age = parseAge(formData.get("age"));
  if (ageRaw && age === null) {
    redirect("/profile?error=age");
  }

  const studyProgramRaw = String(formData.get("studyProgram") ?? "").trim();
  const studyProgram = studyProgramRaw ? studyProgramRaw.slice(0, 120) : null;
  const gender = parseGender(formData.get("gender"));
  const profileVisibility = parseVisibility(formData.get("profileVisibility"));

  const avatarEntry = formData.get("avatar");
  const avatarFile = avatarEntry instanceof File && avatarEntry.size > 0 ? avatarEntry : null;

  let avatarUrl: string | null = null;
  if (avatarFile) {
    try {
      avatarUrl = await uploadAvatar(user.id, avatarFile);
    } catch {
      redirect("/profile?error=avatar");
    }
  }

  const updatePayload: Record<string, string | number | null> = {
    display_name: displayName,
    gender,
    age,
    study_program: studyProgram,
    profile_visibility: profileVisibility,
  };

  if (avatarUrl) {
    updatePayload.avatar_url = avatarUrl;
  }

  const profilesTable = supabase.from("user_profiles") as unknown as {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: { message?: string } | null }>;
    };
  };

  const { error } = await profilesTable.update(updatePayload).eq("id", user.id);

  if (error) {
    console.error("[updateProfileAction] Failed to update profile:", error);
    redirect("/profile?error=save");
  }

  revalidatePath("/profile");
  revalidatePath("/discover");
  redirect("/profile?saved=1");
}
