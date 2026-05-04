import { createClient } from "@/lib/supabase/server";

export type ProfileVisibility = "public" | "members" | "hidden";
export type ProfileGender = "female" | "male" | "diverse";

export type PublicProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  gender: ProfileGender | null;
  age: number | null;
  study_program: string | null;
  profile_visibility: ProfileVisibility;
};

export type VisibleProfileResult = {
  profile: PublicProfile | null;
  isOwnProfile: boolean;
  canViewDetails: boolean;
};

export async function getVisibleProfileByUserId(targetUserId: string): Promise<VisibleProfileResult> {
  const supabase = await createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const safeTarget = targetUserId.trim();
  if (!safeTarget) {
    return { profile: null, isOwnProfile: false, canViewDetails: false };
  }

  const rowResult = await supabase
    .from("user_profiles")
    .select("id, display_name, avatar_url, gender, age, study_program, profile_visibility")
    .eq("id", safeTarget)
    .maybeSingle();

  if (rowResult.error || !rowResult.data) {
    return { profile: null, isOwnProfile: false, canViewDetails: false };
  }

  const profile = {
    id: String(rowResult.data.id),
    display_name: rowResult.data.display_name,
    avatar_url: rowResult.data.avatar_url,
    gender: rowResult.data.gender as ProfileGender | null,
    age: rowResult.data.age,
    study_program: rowResult.data.study_program,
    profile_visibility: (rowResult.data.profile_visibility ?? "members") as ProfileVisibility,
  } satisfies PublicProfile;

  const isOwnProfile = profile.id === viewer?.id;
  const canViewDetails =
    isOwnProfile ||
    profile.profile_visibility === "public" ||
    (profile.profile_visibility === "members" && Boolean(viewer));

  if (!canViewDetails) {
    return {
      profile: {
        ...profile,
        avatar_url: null,
        age: null,
        gender: null,
        study_program: null,
      },
      isOwnProfile,
      canViewDetails: false,
    };
  }

  return { profile, isOwnProfile, canViewDetails: true };
}
