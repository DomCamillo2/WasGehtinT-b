import { createClient } from "@/lib/supabase/server";

type RawRow = Record<string, unknown>;
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

function toStringValue(value: unknown, fallback = "") {
  return String(value ?? fallback);
}

function toTrimmedStringOrNull(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toNumberValue(value: unknown, fallback = 0) {
  const nextValue = Number(value ?? fallback);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function mapPartyRow(row: RawRow): PendingParty {
  return {
    id: toStringValue(row.id),
    hostUserId: toStringValue(row.host_user_id ?? row.host_id),
    submitterName: toTrimmedStringOrNull(row.submitter_name),
    title: toStringValue(row.title, "Unbenannt"),
    description: typeof row.description === "string" ? row.description : null,
    startsAt: toStringValue(row.starts_at ?? row.date ?? row.created_at),
    maxGuests: toNumberValue(row.max_guests),
    contributionCents: toNumberValue(row.contribution_cents),
  };
}

function mapHangoutRow(row: RawRow): PendingHangout {
  return {
    id: toStringValue(row.id),
    userId: toStringValue(row.user_id),
    submitterName: toTrimmedStringOrNull(row.submitter_name),
    title: toStringValue(row.title, "Unbenannt"),
    description: typeof row.description === "string" ? row.description : null,
    locationText: typeof row.location_text === "string" ? row.location_text : null,
    meetupAt: typeof row.meetup_at === "string" ? row.meetup_at : null,
    createdAt: toStringValue(row.created_at),
    activityType:
      typeof row.activity_type === "string"
        ? row.activity_type
        : typeof row.kind === "string"
          ? row.kind
          : null,
  };
}

function mapFeedbackRow(row: RawRow): FeedbackEntry {
  return {
    id: toStringValue(row.id),
    type: row.type === "feature_request" ? "feature_request" : "feedback",
    title: toStringValue(row.title, "Ohne Titel"),
    message: toStringValue(row.message),
    contactEmail: typeof row.contact_email === "string" ? row.contact_email : null,
    status:
      row.status === "reviewing" || row.status === "planned" || row.status === "closed" ? row.status : "open",
    adminNote: typeof row.admin_note === "string" ? row.admin_note : null,
    createdAt: toStringValue(row.created_at),
    reviewedAt: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
  };
}

async function loadPartiesByReviewState(params: {
  supabase: SupabaseServerClient;
  reviewStatus: "pending" | "approved";
  statusFallback: "draft" | "published";
  isPublished: boolean;
  ascending: boolean;
  limit?: number;
}): Promise<{ rows: PendingParty[]; error: unknown }> {
  const { supabase, reviewStatus, statusFallback, isPublished, ascending, limit } = params;

  let reviewQuery = supabase.from("parties").select("*").eq("review_status", reviewStatus).order("created_at", {
    ascending,
  });

  if (typeof limit === "number") {
    reviewQuery = reviewQuery.limit(limit);
  }

  const reviewResult = await reviewQuery;

  if (!isMissingColumnError(reviewResult.error?.code)) {
    return {
      rows: ((reviewResult.data ?? []) as RawRow[]).map(mapPartyRow),
      error: reviewResult.error,
    };
  }

  let fallbackQuery = supabase.from("parties").select("*").eq("status", statusFallback).order("created_at", {
    ascending,
  });

  if (typeof limit === "number") {
    fallbackQuery = fallbackQuery.limit(limit);
  }

  const fallbackResult = await fallbackQuery;

  if (!isMissingColumnError(fallbackResult.error?.code)) {
    return {
      rows: ((fallbackResult.data ?? []) as RawRow[]).map(mapPartyRow),
      error: fallbackResult.error,
    };
  }

  let legacyQuery = supabase.from("parties").select("*").eq("is_published", isPublished).order("created_at", {
    ascending,
  });

  if (typeof limit === "number") {
    legacyQuery = legacyQuery.limit(limit);
  }

  const legacyResult = await legacyQuery;

  return {
    rows: ((legacyResult.data ?? []) as RawRow[]).map(mapPartyRow),
    error: legacyResult.error,
  };
}

async function loadHangoutsByReviewState(params: {
  supabase: SupabaseServerClient;
  reviewStatus: "pending" | "approved";
  statusFallback: "draft" | "published";
  isPublished: boolean;
  ascending: boolean;
  limit?: number;
}): Promise<{ rows: PendingHangout[]; error: unknown }> {
  const { supabase, reviewStatus, statusFallback, isPublished, ascending, limit } = params;

  let reviewQuery = supabase.from("hangouts").select("*").eq("review_status", reviewStatus).order("created_at", {
    ascending,
  });

  if (typeof limit === "number") {
    reviewQuery = reviewQuery.limit(limit);
  }

  const reviewResult = await reviewQuery;

  if (!isMissingColumnError(reviewResult.error?.code)) {
    return {
      rows: ((reviewResult.data ?? []) as RawRow[]).map(mapHangoutRow),
      error: reviewResult.error,
    };
  }

  let fallbackQuery = supabase.from("hangouts").select("*").eq("status", statusFallback).order("created_at", {
    ascending,
  });

  if (typeof limit === "number") {
    fallbackQuery = fallbackQuery.limit(limit);
  }

  const fallbackResult = await fallbackQuery;

  if (!isMissingColumnError(fallbackResult.error?.code)) {
    return {
      rows: ((fallbackResult.data ?? []) as RawRow[]).map(mapHangoutRow),
      error: fallbackResult.error,
    };
  }

  let legacyQuery = supabase.from("hangouts").select("*").eq("is_published", isPublished).order("created_at", {
    ascending,
  });

  if (typeof limit === "number") {
    legacyQuery = legacyQuery.limit(limit);
  }

  const legacyResult = await legacyQuery;

  return {
    rows: ((legacyResult.data ?? []) as RawRow[]).map(mapHangoutRow),
    error: legacyResult.error,
  };
}

async function loadFeedbackEntries(supabase: SupabaseServerClient): Promise<{ rows: FeedbackEntry[]; error: unknown }> {
  const result = await supabase
    .from("feedback_entries")
    .select("id, type, title, message, contact_email, status, admin_note, created_at, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return {
    rows: ((result.data ?? []) as RawRow[]).map(mapFeedbackRow),
    error: result.error,
  };
}

async function loadHostNameMap(params: {
  supabase: SupabaseServerClient;
  pending: PendingParty[];
  pendingHangouts: PendingHangout[];
  approvedParties: ReviewedParty[];
  approvedHangouts: ReviewedHangout[];
}) {
  const hostIds = Array.from(
    new Set(
      [
        ...params.pending.map((row) => row.hostUserId),
        ...params.pendingHangouts.map((row) => row.userId),
        ...params.approvedParties.map((row) => row.hostUserId),
        ...params.approvedHangouts.map((row) => row.userId),
      ].filter((value) => typeof value === "string" && value.length > 0),
    ),
  );

  if (!hostIds.length) {
    return new Map<string, string>();
  }

  const result = await params.supabase.from("user_profiles").select("id, display_name").in("id", hostIds);

  return new Map(
    ((result.data ?? []) as Array<{ id: string; display_name: string | null }>).map((row) => [
      row.id,
      row.display_name?.trim() || "Betreiber",
    ]),
  );
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

  const [
    pendingResult,
    pendingHangoutsResult,
    approvedPartiesResult,
    approvedHangoutsResult,
    feedbackResult,
  ] = await Promise.all([
    loadPartiesByReviewState({
      supabase,
      reviewStatus: "pending",
      statusFallback: "draft",
      isPublished: false,
      ascending: true,
    }),
    loadHangoutsByReviewState({
      supabase,
      reviewStatus: "pending",
      statusFallback: "draft",
      isPublished: false,
      ascending: true,
    }),
    loadPartiesByReviewState({
      supabase,
      reviewStatus: "approved",
      statusFallback: "published",
      isPublished: true,
      ascending: false,
      limit: 40,
    }),
    loadHangoutsByReviewState({
      supabase,
      reviewStatus: "approved",
      statusFallback: "published",
      isPublished: true,
      ascending: false,
      limit: 40,
    }),
    loadFeedbackEntries(supabase),
  ]);

  const hostNameMap = await loadHostNameMap({
    supabase,
    pending: pendingResult.rows,
    pendingHangouts: pendingHangoutsResult.rows,
    approvedParties: approvedPartiesResult.rows,
    approvedHangouts: approvedHangoutsResult.rows,
  });

  return {
    pending: pendingResult.rows,
    pendingError: pendingResult.error,
    pendingHangouts: pendingHangoutsResult.rows,
    pendingHangoutsError: pendingHangoutsResult.error,
    approvedParties: approvedPartiesResult.rows,
    approvedHangouts: approvedHangoutsResult.rows,
    feedbackEntries: feedbackResult.rows,
    feedbackError: feedbackResult.error,
    hostNameMap,
  };
}
