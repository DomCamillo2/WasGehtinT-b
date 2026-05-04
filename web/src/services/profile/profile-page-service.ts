import { createClient } from "@/lib/supabase/server";

type ProfileDbRow = {
  display_name: string | null;
  avatar_url: string | null;
  gender: "female" | "male" | "diverse" | null;
  age: number | null;
  study_program: string | null;
  profile_visibility: "public" | "members" | "hidden" | null;
};

export type ProfileViewModel = {
  displayName: string | null;
  avatarUrl: string | null;
  gender: "female" | "male" | "diverse" | null;
  age: number | null;
  studyProgram: string | null;
  profileVisibility: "public" | "members" | "hidden" | null;
};

export type SubmissionViewModel = {
  id: string;
  title: string;
  startsAt: string;
  createdAt: string;
  status: string | null;
  reviewStatus: string | null;
};

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

export type ProfilePageData = {
  userEmail: string;
  userDisplayFallback: string;
  userAvatarFallback: string;
  profile: ProfileViewModel;
  submissions: SubmissionViewModel[];
};

export async function loadProfilePageData(): Promise<ProfilePageData | null> {
  const supabase = await createClient();
  const authResult = await supabase.auth.getUser();
  const user = authResult.data.user;

  if (!user) {
    return null;
  }

  const profileResult = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url, gender, age, study_program, profile_visibility")
    .eq("id", user.id)
    .maybeSingle();

  const submissionQuery = await supabase
    .from("parties")
    .select("id, title, starts_at, created_at, status, review_status")
    .eq("host_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const fallbackSubmissionQuery = await (isMissingColumnError(submissionQuery.error?.code)
    ? supabase
        .from("parties")
        .select("id, title, starts_at, created_at, status")
        .eq("host_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12)
    : Promise.resolve({ data: null as null, error: null as null }));

  const useFallback = isMissingColumnError(submissionQuery.error?.code);
  const fallbackErrorCode = useFallback ? fallbackSubmissionQuery.error?.code : submissionQuery.error?.code;

  const legacySubmissionQuery = await (isMissingColumnError(fallbackErrorCode)
    ? supabase
        .from("parties")
        .select("id, title, date, created_at, is_published, review_status")
        .eq("host_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12)
    : Promise.resolve({ data: null as null }));

  const useLegacy = isMissingColumnError(fallbackErrorCode);

  const rawSubmissionRows = useLegacy
    ? ((legacySubmissionQuery.data ?? []) as Array<Record<string, unknown>>)
    : useFallback
      ? ((fallbackSubmissionQuery.data ?? []) as Array<Record<string, unknown>>)
      : ((submissionQuery.data ?? []) as Array<Record<string, unknown>>);

  const submissions = rawSubmissionRows.map((row) => {
    const rawStatus = row.status;
    const rawPublished = row.is_published;

    return {
      id: String(row.id ?? ""),
      title: String(row.title ?? "Unbenannt"),
      startsAt: String(row.starts_at ?? row.date ?? row.created_at ?? ""),
      createdAt: String(row.created_at ?? ""),
      status:
        typeof rawStatus === "string"
          ? rawStatus
          : typeof rawPublished === "boolean"
            ? rawPublished
              ? "published"
              : "draft"
            : null,
      reviewStatus: typeof row.review_status === "string" ? row.review_status : null,
    } as SubmissionViewModel;
  });

  const profile = (profileResult.data ?? {
    display_name: user.user_metadata.display_name ?? user.email?.split("@")[0] ?? "",
    avatar_url: null,
    gender: null,
    age: null,
    study_program: null,
    profile_visibility: "members",
  }) as ProfileDbRow;

  const profileViewModel: ProfileViewModel = {
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    gender: profile.gender,
    age: profile.age,
    studyProgram: profile.study_program,
    profileVisibility: profile.profile_visibility,
  };

  const userEmail = user.email ?? "";
  const userDisplayFallback = user.user_metadata.display_name ?? user.email?.split("@")[0] ?? "";
  const userAvatarFallback = String(profileViewModel.displayName?.[0] ?? user.email?.[0] ?? "U").toUpperCase();

  return {
    userEmail,
    userDisplayFallback,
    userAvatarFallback,
    profile: profileViewModel,
    submissions,
  };
}