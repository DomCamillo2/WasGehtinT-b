import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { BringProgress, ChatPreview, PartyCard } from "@/lib/types";

export type UserRole = "student" | "owner" | "admin";

type EventWindowOptions = {
  fromIso?: string;
  untilIso?: string;
  limit?: number;
};

function inferExternalCategoryFields(input: {
  title?: string | null;
  description?: string | null;
  vibe_label?: string | null;
  category_slug?: string | null;
  category_label?: string | null;
  event_scope?: "nightlife" | "daytime" | "mixed" | null;
}) {
  if (input.category_slug || input.category_label || input.event_scope) {
    return {
      category_slug: input.category_slug ?? null,
      category_label: input.category_label ?? null,
      event_scope: input.event_scope ?? null,
    };
  }

  const haystack = [input.title, input.description, input.vibe_label]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

  if (haystack.includes("flohmarkt")) {
    return {
      category_slug: "flea-market",
      category_label: "Flohmarkt",
      event_scope: "daytime" as const,
    };
  }

  if (
    haystack.includes("markt") ||
    haystack.includes("messe") ||
    haystack.includes("weihnachtsmarkt") ||
    haystack.includes("regionalmarkt") ||
    haystack.includes("kunstmarkt") ||
    haystack.includes("fairer markt") ||
    haystack.includes("martinimarkt") ||
    haystack.includes("georgimarkt")
  ) {
    return {
      category_slug: "market",
      category_label: "Markt",
      event_scope: "daytime" as const,
    };
  }

  return {
    category_slug: null,
    category_label: null,
    event_scope: null,
  };
}

export async function requireUser() {
  if (!hasSupabaseEnv()) {
    redirect("/?setup=1");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return { supabase, user };
}

export async function getPublicParties(options: EventWindowOptions = {}) {
  const supabase = await createClient();
  const nowIso = options.fromIso ?? new Date().toISOString();

  let query = supabase
    .from("v_public_parties")
    .select("*")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true });

  if (options.untilIso) {
    query = query.lte("starts_at", options.untilIso);
  }

  if (typeof options.limit === "number") {
    query = query.limit(options.limit);
  }

  let queryResult = await query;

  if (queryResult.error?.code === "42703" || queryResult.error?.code === "PGRST204") {
    let fallbackQuery = supabase
      .from("v_public_parties")
      .select("*")
      .gte("date", nowIso)
      .order("date", { ascending: true });

    if (options.untilIso) {
      fallbackQuery = fallbackQuery.lte("date", options.untilIso);
    }

    if (typeof options.limit === "number") {
      fallbackQuery = fallbackQuery.limit(options.limit);
    }

    queryResult = await fallbackQuery;
  }

  const { data, error } = queryResult;

  if (error) {
    console.error("[getPublicParties] Failed:", error.message);
    return [] as PartyCard[];
  }

  const rows = (data ?? []) as Array<{
    id: string;
    title: string;
    description: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    max_guests: number | null;
    contribution_cents: number | null;
    public_lat: number | null;
    public_lng: number | null;
    is_external?: boolean | null;
    external_link?: string | null;
    status?: string | null;
    vibe_label: string | null;
    spots_left: number | null;
    location_name?: string | null;
    date?: string | null;
    location?: string | null;
    review_status?: string | null;
    is_published?: boolean | null;
    created_at: string;
  }>;

  return rows
    .filter((row) => {
      const publishedByStatus = row.status === "published";
      const approvedByReview = row.review_status === "approved";
      const publishedByLegacyFlag = row.is_published === true;
      return publishedByStatus || approvedByReview || publishedByLegacyFlag;
    })
    .map((row) => {
      const startsAt = row.starts_at ?? row.date ?? row.created_at;
      const endsAt = row.ends_at ?? row.starts_at ?? row.date ?? row.created_at;

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        starts_at: startsAt,
        ends_at: endsAt,
        max_guests: Number(row.max_guests ?? 50),
        contribution_cents: Number(row.contribution_cents ?? 0),
        public_lat: row.public_lat ?? null,
        public_lng: row.public_lng ?? null,
        is_external: row.is_external === true,
        external_link: row.external_link ?? null,
        vibe_label: row.vibe_label ?? "Party",
        spots_left: Number(row.spots_left ?? row.max_guests ?? 50),
        location_name: row.location_name ?? row.location ?? "Tübingen",
        source_badge: "Party",
        is_community: false,
        upvote_count: 0,
        upvoted_by_me: false,
      } as PartyCard;
    });
}

export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = await createClient();
  const result = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (result.error) {
    return "student";
  }

  const role = (result.data?.role ?? "student") as string;
  if (role === "owner" || role === "admin") {
    return role;
  }

  return "student";
}

export async function getExternalEvents(options: EventWindowOptions = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("v_external_events_public")
    .select("*")
    .order("starts_at", { ascending: true });

  if (options.fromIso) {
    query = query.gte("starts_at", options.fromIso);
  }

  if (options.untilIso) {
    query = query.lte("starts_at", options.untilIso);
  }

  if (typeof options.limit === "number") {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getExternalEvents] Failed to fetch external events:", error.message);
    return [] as PartyCard[];
  }

  // Map external events to PartyCard format and support legacy/alternative view column names.
  const isOfficialScraperLabel = (value?: string | null) => {
    const normalized = (value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
    return normalized === "official scraper";
  };

  return ((data ?? []) as Array<{
    id: string | number;
    source?: string | null;
    title: string;
    description?: string | null;
    location_name?: string | null;
    location?: string | null;
    public_lat?: number | null;
    lat?: number | null;
    public_lng?: number | null;
    lng?: number | null;
    starts_at: string;
    ends_at?: string | null;
    external_link?: string | null;
    vibe_label?: string | null;
    music_genre?: string | null;
    category_slug?: string | null;
    category_label?: string | null;
    event_scope?: "nightlife" | "daytime" | "mixed" | null;
    is_all_day?: boolean | null;
    audience_label?: string | null;
    price_info?: string | null;
  }>).map((event) => {
    const locationName = event.location_name ?? event.location ?? null;
    const lat = event.public_lat ?? event.lat ?? null;
    const lng = event.public_lng ?? event.lng ?? null;
    const endsAt = event.ends_at ?? event.starts_at;
    const inferredCategory = inferExternalCategoryFields(event);

    return {
      id: String(event.id),
      title: event.title,
      description: event.description ?? null,
      starts_at: event.starts_at,
      ends_at: endsAt,
      max_guests: 0,
      contribution_cents: 0,
      public_lat: lat,
      public_lng: lng,
      is_external: true,
      external_link: event.external_link ?? null,
      vibe_label: event.vibe_label ?? "Sonstiges",
      spots_left: 0,
      location_name: locationName,
      music_genre: event.music_genre ?? null,
      category_slug: inferredCategory.category_slug,
      category_label: inferredCategory.category_label,
      event_scope: inferredCategory.event_scope,
      is_all_day: event.is_all_day === true,
      audience_label: event.audience_label ?? null,
      price_info: event.price_info ?? null,
      source_badge: event.source && !isOfficialScraperLabel(event.source) ? event.source : null,
      is_community: false,
      upvote_count: 0,
      upvoted_by_me: false,
    } as PartyCard;
  });
}

export async function getExternalEventById(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("v_external_events_public")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("[getExternalEventById] Failed to fetch external event:", error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  const event = data as {
    id: string | number;
    source?: string | null;
    title: string;
    description?: string | null;
    location_name?: string | null;
    location?: string | null;
    public_lat?: number | null;
    lat?: number | null;
    public_lng?: number | null;
    lng?: number | null;
    starts_at: string;
    ends_at?: string | null;
    external_link?: string | null;
    vibe_label?: string | null;
    music_genre?: string | null;
    category_slug?: string | null;
    category_label?: string | null;
    event_scope?: "nightlife" | "daytime" | "mixed" | null;
    is_all_day?: boolean | null;
    audience_label?: string | null;
    price_info?: string | null;
  };

  const isOfficialScraperLabel = (value?: string | null) => {
    const normalized = (value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
    return normalized === "official scraper";
  };
  const inferredCategory = inferExternalCategoryFields(event);

  return {
    id: String(event.id),
    title: event.title,
    description: event.description ?? null,
    starts_at: event.starts_at,
    ends_at: event.ends_at ?? event.starts_at,
    max_guests: 0,
    contribution_cents: 0,
    public_lat: event.public_lat ?? event.lat ?? null,
    public_lng: event.public_lng ?? event.lng ?? null,
    is_external: true,
    external_link: event.external_link ?? null,
    vibe_label: event.vibe_label ?? "Sonstiges",
    spots_left: 0,
    location_name: event.location_name ?? event.location ?? null,
    music_genre: event.music_genre ?? null,
    category_slug: inferredCategory.category_slug,
    category_label: inferredCategory.category_label,
    event_scope: inferredCategory.event_scope,
    is_all_day: event.is_all_day === true,
    audience_label: event.audience_label ?? null,
    price_info: event.price_info ?? null,
    source_badge: event.source && !isOfficialScraperLabel(event.source) ? event.source : null,
    is_community: false,
    upvote_count: 0,
    upvoted_by_me: false,
  } as PartyCard;
}

export async function getCommunityHangoutsForDiscover(options: EventWindowOptions = {}) {
  const supabase = await createClient();
  const nowIso = options.fromIso ?? new Date().toISOString();

  let query = supabase
    .from("hangouts")
    .select("id, title, description, meetup_at, created_at, location_text, review_status, status, is_published")
    .gte("meetup_at", nowIso)
    .order("meetup_at", { ascending: true });

  if (options.untilIso) {
    query = query.lte("meetup_at", options.untilIso);
  }

  if (typeof options.limit === "number") {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getCommunityHangoutsForDiscover] Failed to fetch hangouts:", error.message);
    return [] as PartyCard[];
  }

  const rows =
    (data ?? []) as Array<{
      id: string;
      title: string | null;
      description: string | null;
      meetup_at: string | null;
      created_at: string | null;
      location_text: string | null;
      review_status?: string;
      status?: string;
      is_published?: boolean;
    }>;

  // Filter for approved events
  const filteredRows = rows.filter((row) => {
    const approved = row.review_status === "approved";
    const published = row.status === "published";
    const isPublished = row.is_published === true;
    return approved || published || isPublished;
  });

  return filteredRows
    .filter((row) => typeof row.meetup_at === "string" && row.meetup_at.length > 0)
    .map((row) => {
      const startsAt = row.meetup_at as string;
      const safeTitle = (row.title ?? "Community Event").trim() || "Community Event";
      const safeLocation = (row.location_text ?? "Community").trim() || "Community";

      const mapped: PartyCard = {
        id: row.id,
        title: safeTitle,
        description: row.description ?? null,
        starts_at: startsAt,
        ends_at: startsAt,
        max_guests: 99,
        contribution_cents: 0,
        public_lat: null,
        public_lng: null,
        is_external: false,
        external_link: null,
        vibe_label: "Community",
        spots_left: 99,
        location_name: safeLocation,
        source_badge: "Community",
        is_community: true,
        upvote_count: 0,
        upvoted_by_me: false,
      };

      return mapped;
    });
}

export async function getBringProgressMap(partyIds: string[]) {
  if (!partyIds.length) {
    return {} as Record<string, BringProgress[]>;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("v_party_bring_progress")
    .select("*")
    .in("party_id", partyIds);

  const rows = (data ?? []) as Array<BringProgress & { party_id: string }>;
  return rows.reduce<Record<string, BringProgress[]>>((acc, row) => {
    if (!acc[row.party_id]) {
      acc[row.party_id] = [];
    }

    acc[row.party_id].push({
      bring_item_id: row.bring_item_id,
      item_name: row.item_name,
      quantity_needed: row.quantity_needed,
      quantity_committed: row.quantity_committed,
      quantity_open: row.quantity_open,
    });

    return acc;
  }, {});
}

export async function getBringItemsForParty(partyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bring_items")
    .select("id, item_name, quantity_needed")
    .eq("party_id", partyId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (data ?? []) as Array<{ id: string; item_name: string; quantity_needed: number }>;
}

export async function getMyRequests(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_my_requests")
    .select("*")
    .eq("requester_user_id", userId)
    .order("requested_at", { ascending: false });

  return (data ?? []) as Array<Record<string, string | number | null>>;
}

export async function getPartyAddressForUser(partyId: string, userId: string) {
  const supabase = await createClient();

  const [{ data: party }, { data: accepted }] = await Promise.all([
    supabase.from("parties").select("id, host_user_id, title").eq("id", partyId).maybeSingle(),
    supabase
      .from("party_requests")
      .select("id")
      .eq("party_id", partyId)
      .eq("requester_user_id", userId)
      .eq("status", "accepted")
      .maybeSingle(),
  ]);

  if (!party) {
    return null;
  }

  const isHost = party.host_user_id === userId;
  const isAcceptedGuest = Boolean(accepted);

  if (!isHost && !isAcceptedGuest) {
    return null;
  }

  const { data: location } = await supabase
    .from("party_locations")
    .select("street, house_number, postal_code, city, address_note")
    .eq("party_id", partyId)
    .maybeSingle();

  return {
    partyTitle: party.title,
    location,
  };
}

export async function getHostDashboard(userId: string) {
  const supabase = await createClient();

  const [dashboardRes, vibesRes] = await Promise.all([
    supabase
      .from("v_host_party_dashboard")
      .select("*")
      .eq("host_user_id", userId)
      .order("starts_at", { ascending: true }),
    supabase.from("party_vibes").select("id, label").eq("is_active", true),
  ]);

  const fallbackVibesRes = await (vibesRes.error
    ? supabase.from("party_vibes").select("id, label")
    : Promise.resolve({ data: null as null, error: null as null }));

  const safeVibes =
    vibesRes.error && fallbackVibesRes.data
      ? fallbackVibesRes.data
      : (vibesRes.data ?? []);

  const hostPartyIds = new Set(
    ((dashboardRes.data ?? []) as Array<{ party_id: string }>).map((party) => party.party_id),
  );

  const hostPartyIdList = Array.from(hostPartyIds);
  const requestsRes =
    hostPartyIdList.length > 0
      ? await supabase
          .from("party_requests")
          .select("id, party_id, requester_user_id, group_size, status, message, created_at, parties(title)")
          .eq("status", "pending")
          .in("party_id", hostPartyIdList)
          .order("created_at", { ascending: false })
      : ({ data: [] } as { data: Array<Record<string, unknown>> });

  const pending = (requestsRes.data ?? []) as Array<Record<string, unknown>>;

  return {
    dashboard: (dashboardRes.data ?? []) as Array<Record<string, string | number | null>>,
    pending,
    vibes: (safeVibes as Array<{ id: number; label: string | null }>)
      .filter((vibe) => typeof vibe.id === "number" && Number.isFinite(vibe.id))
      .map((vibe) => ({
        id: vibe.id,
        label: (vibe.label ?? "").trim() || `Vibe #${vibe.id}`,
      })),
  };
}

export async function getChatThreads(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_chat_threads_with_last_message")
    .select("*")
    .or(`host_user_id.eq.${userId},guest_user_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  return (data ?? []) as ChatPreview[];
}

export async function getChatMessages(threadId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("id, thread_id, sender_user_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  return (data ?? []) as Array<{
    id: string;
    sender_user_id: string;
    body: string;
    created_at: string;
  }>;
}
