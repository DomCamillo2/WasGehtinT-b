import { getVisibleProfileByUserId } from "@/lib/profile";

export type PublicProfileViewModel = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  gender: "female" | "male" | "diverse" | null;
  age: number | null;
  studyProgram: string | null;
};

export type PublicProfilePageData = {
  profile: PublicProfileViewModel | null;
  isOwnProfile: boolean;
  canViewDetails: boolean;
};

export async function loadPublicProfilePageData(userId: string): Promise<PublicProfilePageData> {
  const result = await getVisibleProfileByUserId(userId);

  if (!result.profile) {
    return {
      profile: null,
      isOwnProfile: false,
      canViewDetails: false,
    };
  }

  return {
    profile: {
      id: result.profile.id,
      displayName: result.profile.display_name,
      avatarUrl: result.profile.avatar_url,
      gender: result.profile.gender,
      age: result.profile.age,
      studyProgram: result.profile.study_program,
    },
    isOwnProfile: result.isOwnProfile,
    canViewDetails: result.canViewDetails,
  };
}
