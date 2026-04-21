import { createClient } from "@/lib/supabase/server";

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

export type PendingParty = {
  id: string;
  hostUserId: string;
  submitterName: string | null;
  title: string;
  description: string | null;
  startsAt: string;
  maxGuests: number;
  contributionCents: number;
};

export type PendingHangout = {
  id: string;
  userId: string;
  submitterName: string | null;
  title: string;
  description: string | null;
  locationText: string | null;
  meetupAt: string | null;
  createdAt: string;
  activityType: string | null;
};

export type ReviewedParty = PendingParty;
export type ReviewedHangout = PendingHangout;

export type FeedbackEntry = {
  id: string;
  type: "feedback" | "feature_request";
  title: string;
  message: string;
  contactEmail: string | null;
  status: "open" | "reviewing" | "planned" | "closed";
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type AdminDashboardData = {
  pending: PendingParty[];
  pendingError: unknown;
  pendingHangouts: PendingHangout[];
  pendingHangoutsError: unknown;
  approvedParties: ReviewedParty[];
  approvedHangouts: ReviewedHangout[];
  feedbackEntries: FeedbackEntry[];
  feedbackError: unknown;
  hostNameMap: Map<string, string>;
};

export async function loadAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = await createClient();

  const pendingQuery = await supabase
    .from("parties")
    .select("*")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });

  const fallbackPendingQuery = await (isMissingColumnError(pendingQuery.error?.code)
    ? supabase
        .from("parties")
        .select("*")
        .eq("status", "draft")
        .order("created_at", { ascending: true })
    : Promise.resolve({ data: null as null, error: null as null }));

  const useFallback = isMissingColumnError(pendingQuery.error?.code);
  const fallbackErrorCode = useFallback ? fallbackPendingQuery.error?.code : pendingQuery.error?.code;

  const legacyPendingQuery = await (isMissingColumnError(fallbackErrorCode)
    ? supabase
        .from("parties")
        .select("*")
        .eq("is_published", false)
        .order("created_at", { ascending: true })
    : Promise.resolve({ data: null as null, error: null as null }));

  const useLegacy = isMissingColumnError(fallbackErrorCode);

  const rawPending = useLegacy
    ? ((legacyPendingQuery.data ?? []) as Array<Record<string, unknown>>)
    : useFallback
      ? ((fallbackPendingQuery.data ?? []) as Array<Record<string, unknown>>)
      : ((pendingQuery.data ?? []) as Array<Record<string, unknown>>);

  const pendingError = useLegacy ? legacyPendingQuery.error : useFallback ? fallbackPendingQuery.error : pendingQuery.error;

  const pending: PendingParty[] = rawPending.map((row) => ({
    id: String(row.id ?? ""),
    hostUserId: String(row.host_user_id ?? row.host_id ?? ""),
    submitterName: typeof row.submitter_name === "string" && row.submitter_name.trim() ? row.submitter_name.trim() : null,
    title: String(row.title ?? "Unbenannt"),
    description: typeof row.description === "string" ? row.description : null,
    startsAt: String(row.starts_at ?? row.date ?? row.created_at ?? ""),
    maxGuests: Number(row.max_guests ?? 0),
    contributionCents: Number(row.contribution_cents ?? 0),
  }));

  const pendingHangoutsQuery = await supabase
    .from("hangouts")
    .select("*")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });

  const rawHangouts = (pendingHangoutsQuery.data ?? []) as Array<Record<string, unknown>>;
  const pendingHangoutsError = pendingHangoutsQuery.error;

  const pendingHangouts: PendingHangout[] = rawHangouts.map((row) => ({
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    submitterName: typeof row.submitter_name === "string" && row.submitter_name.trim() ? row.submitter_name.trim() : null,
    title: String(row.title ?? "Unbenannt"),
    description: typeof row.description === "string" ? row.description : null,
    locationText: typeof row.location_text === "string" ? row.location_text : null,
    meetupAt: typeof row.meetup_at === "string" ? row.meetup_at : null,
    createdAt: String(row.created_at ?? ""),
    activityType:
      typeof row.activity_type === "string"
        ? row.activity_type
        : typeof row.kind === "string"
          ? row.kind
          : null,
  }));

  const approvedQuery = await supabase
    .from("parties")
    .select("*")
    .eq("review_status", "approved")
    .order("created_at", { ascending: false })
    .limit(40);

  const fallbackApprovedQuery = await (isMissingColumnError(approvedQuery.error?.code)
    ? supabase
        .from("parties")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(40)
    : Promise.resolve({ data: null as null, error: null as null }));

  const useApprovedFallback = isMissingColumnError(approvedQuery.error?.code);
  const approvedFallbackErrorCode = useApprovedFallback
    ? fallbackApprovedQuery.error?.code
    : approvedQuery.error?.code;

  const legacyApprovedQuery = await (isMissingColumnError(approvedFallbackErrorCode)
    ? supabase
        .from("parties")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(40)
    : Promise.resolve({ data: null as null, error: null as null }));

  const useApprovedLegacy = isMissingColumnError(approvedFallbackErrorCode);

  const rawApproved = useApprovedLegacy
    ? ((legacyApprovedQuery.data ?? []) as Array<Record<string, unknown>>)
    : useApprovedFallback
      ? ((fallbackApprovedQuery.data ?? []) as Array<Record<string, unknown>>)
      : ((approvedQuery.data ?? []) as Array<Record<string, unknown>>);

  const approvedParties: ReviewedParty[] = rawApproved.map((row) => ({
    id: String(row.id ?? ""),
    hostUserId: String(row.host_user_id ?? row.host_id ?? ""),
    submitterName: typeof row.submitter_name === "string" && row.submitter_name.trim() ? row.submitter_name.trim() : null,
    title: String(row.title ?? "Unbenannt"),
    description: typeof row.description === "string" ? row.description : null,
    startsAt: String(row.starts_at ?? row.date ?? row.created_at ?? ""),
    maxGuests: Number(row.max_guests ?? 0),
    contributionCents: Number(row.contribution_cents ?? 0),
  }));

  const approvedHangoutsQuery = await supabase
    .from("hangouts")
    .select("*")
    .or("review_status.eq.approved,status.eq.published,is_published.eq.true")
    .order("created_at", { ascending: false })
    .limit(40);

  const approvedHangouts: ReviewedHangout[] = ((approvedHangoutsQuery.data ?? []) as Array<Record<string, unknown>>).map(
    (row) => ({
      id: String(row.id ?? ""),
      userId: String(row.user_id ?? ""),
      submitterName:
        typeof row.submitter_name === "string" && row.submitter_name.trim() ? row.submitter_name.trim() : null,
      title: String(row.title ?? "Unbenannt"),
      description: typeof row.description === "string" ? row.description : null,
      locationText: typeof row.location_text === "string" ? row.location_text : null,
      meetupAt: typeof row.meetup_at === "string" ? row.meetup_at : null,
      createdAt: String(row.created_at ?? ""),
      activityType:
        typeof row.activity_type === "string"
          ? row.activity_type
          : typeof row.kind === "string"
            ? row.kind
            : null,
    }),
  );

  const feedbackQuery = await supabase
    .from("feedback_entries")
    .select("id, type, title, message, contact_email, status, admin_note, created_at, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const feedbackError = feedbackQuery.error;
  const feedbackEntries: FeedbackEntry[] = ((feedbackQuery.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    type: row.type === "feature_request" ? "feature_request" : "feedback",
    title: String(row.title ?? "Ohne Titel"),
    message: String(row.message ?? ""),
    contactEmail: typeof row.contact_email === "string" ? row.contact_email : null,
    status:
      row.status === "reviewing" || row.status === "planned" || row.status === "closed" ? row.status : "open",
    adminNote: typeof row.admin_note === "string" ? row.admin_note : null,
    createdAt: String(row.created_at ?? ""),
    reviewedAt: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
  }));

  const hostIds = Array.from(
    new Set(
      [...pending.map((row) => row.hostUserId), ...pendingHangouts.map((row) => row.userId)].filter(
        (value) => typeof value === "string" && value.length > 0,
      ),
    ),
  );

  const hostResult = hostIds.length
    ? await supabase.from("user_profiles").select("id, display_name").in("id", hostIds)
    : { data: [] as Array<{ id: string; display_name: string | null }> };

  const hostNameMap = new Map(
    ((hostResult.data ?? []) as Array<{ id: string; display_name: string | null }>).map((row) => [
      row.id,
      row.display_name?.trim() || "Betreiber",
    ]),
  );

  return {
    pending,
    pendingError,
    pendingHangouts,
    pendingHangoutsError,
    approvedParties,
    approvedHangouts,
    feedbackEntries,
    feedbackError,
    hostNameMap,
  };
}
