import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { getCommunityHangoutsForDiscover, getExternalEvents, getPublicParties } from "@/lib/data";
import { enrichPartiesWithDiscoverHeroImages } from "@/lib/discover-event-images";
import type { DiscoverFilterKey } from "@/lib/discover-filters";
import { applyTrafficBasedUpvoteEstimates } from "@/lib/discover-traffic-upvotes";
import { getSupabasePublicServerClient } from "@/lib/supabase/public-server";
import { createClient } from "@/lib/supabase/server";
import { PartyCard } from "@/lib/types";
import { DiscoverEvent, mapPartyCardToDiscoverEvent } from "@/services/discover/discover-view-model";

const DEFAULT_WEEKS = 4;
const MAX_WEEKS = 24;
const MIN_DISCOVER_EVENTS_ON_ENTRY = 12;

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

function clampWeeks(value: string | undefined) {
  const parsed = Number(value ?? DEFAULT_WEEKS);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_WEEKS;
  }

  return Math.max(DEFAULT_WEEKS, Math.min(MAX_WEEKS, Math.floor(parsed)));
}

function addWeeks(baseDate: Date, weeks: number) {
  const next = new Date(baseDate);
  next.setUTCDate(next.getUTCDate() + weeks * 7);
  return next;
}

async function enrichPartiesForDiscover(parties: PartyCard[]): Promise<PartyCard[]> {
  if (!parties.length) {
    return parties;
  }

  const supabase = await createClient();
  const partyIds = parties.map((party) => party.id);

  // Use host IDs already present on the party cards to start the avatar fetch
  // in parallel with the parties table query (which adds location_name).
  const preliminaryHostIds = Array.from(
    new Set(
      parties
        .map((p) => p.host_user_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  const [{ data: partyRows, error: partyRowsError }, avatarResultPrelim] = await Promise.all([
    supabase.from("parties").select("id, host_user_id, location_name").in("id", partyIds),
    preliminaryHostIds.length > 0
      ? supabase
          .from("user_profiles")
          .select("id, avatar_url, profile_visibility")
          .in("id", preliminaryHostIds)
      : Promise.resolve({ data: [] as Array<{ id: string; avatar_url: string | null; profile_visibility?: string | null }>, error: null }),
  ]);

  // If location_name column is missing fall back without it (rare schema-migration case).
  const fallbackPartyRowsResult = await (isMissingColumnError(partyRowsError?.code)
    ? supabase.from("parties").select("id, host_user_id").in("id", partyIds)
    : Promise.resolve({ data: null as null, error: null as null }));

  const safePartyRows =
    partyRowsError && fallbackPartyRowsResult.data
      ? (fallbackPartyRowsResult.data as Array<{ id: string; host_user_id: string | null }>)
      : ((partyRows ?? []) as Array<{
          id: string;
          host_user_id: string | null;
          location_name?: string | null;
        }>);

  // If the parties table returned different host IDs than what the view had,
  // fetch the missing avatars now (usually a no-op).
  const authoratativeHostIds = Array.from(
    new Set(
      safePartyRows
        .map((row) => row.host_user_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );
  const missingHostIds = authoratativeHostIds.filter((id) => !preliminaryHostIds.includes(id));
  const extraAvatarResult =
    missingHostIds.length > 0
      ? await supabase
          .from("user_profiles")
          .select("id, avatar_url, profile_visibility")
          .in("id", missingHostIds)
      : { data: [] as Array<{ id: string; avatar_url: string | null; profile_visibility?: string | null }>, error: null };

  const allAvatarRows = [
    ...((avatarResultPrelim.data ?? []) as Array<{ id: string; avatar_url: string | null; profile_visibility?: string | null }>),
    ...((extraAvatarResult.data ?? []) as Array<{ id: string; avatar_url: string | null; profile_visibility?: string | null }>),
  ];

  const avatarMap = new Map(
    allAvatarRows
      .filter(
        (row) =>
          typeof row.avatar_url === "string" &&
          row.avatar_url.length > 0 &&
          row.profile_visibility !== "hidden",
      )
      .map((row) => [row.id, row.avatar_url as string]),
  );

  const metaByPartyId = new Map(
    safePartyRows.map((row) => [
      row.id,
      {
        host_user_id: row.host_user_id,
        location_name:
          "location_name" in row && typeof row.location_name === "string"
            ? row.location_name
            : null,
      },
    ]),
  );

  return parties.map((party) => {
    const meta = metaByPartyId.get(party.id);
    const hostAvatar = meta?.host_user_id ? avatarMap.get(meta.host_user_id) ?? null : null;

    return {
      ...party,
      host_user_id: meta?.host_user_id ?? party.host_user_id ?? null,
      location_name: meta?.location_name ?? party.location_name ?? null,
      host_avatar_url: hostAvatar ?? party.host_avatar_url ?? null,
    };
  });
}

type DiscoverSearchParams = {
  view?: string;
  date?: string;
  type?: string;
  weeks?: string;
  liked?: string;
};

export type DiscoverViewMode = "cards" | "list" | "calendar" | "map";

export type DiscoverPageData = {
  parties: DiscoverEvent[];
  avatarFallback: string;
  isAuthenticated: boolean;
  canLoadMore: boolean;
  currentWeeks: number;
  initialView: DiscoverViewMode;
  initialFilter: DiscoverFilterKey;
  initialCalendarDate: string;
};

type DiscoverPublicData = {
  dbParties: PartyCard[];
  externalParties: PartyCard[];
  communityHangouts: PartyCard[];
};

function mergeUniqueById(items: PartyCard[]): PartyCard[] {
  const seen = new Set<string>();
  const merged: PartyCard[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

function mergeDiscoverPublicData(left: DiscoverPublicData, right: DiscoverPublicData): DiscoverPublicData {
  return {
    dbParties: mergeUniqueById([...left.dbParties, ...right.dbParties]),
    externalParties: mergeUniqueById([...left.externalParties, ...right.externalParties]),
    communityHangouts: mergeUniqueById([...left.communityHangouts, ...right.communityHangouts]),
  };
}

const loadDiscoverPublicDataCached = unstable_cache(
  async (fromIso: string, untilIso: string): Promise<DiscoverPublicData> => {
    const publicSupabase = getSupabasePublicServerClient();

    const [dbParties, externalParties, communityHangouts] = await Promise.all([
      getPublicParties({ fromIso, untilIso }, publicSupabase),
      getExternalEvents({ fromIso, untilIso }, publicSupabase),
      getCommunityHangoutsForDiscover({ fromIso, untilIso }, publicSupabase),
    ]);

    return {
      dbParties,
      externalParties,
      communityHangouts,
    };
  },
  ["discover-public-data-v1"],
  {
    revalidate: 300,
    tags: ["discover-public"],
  },
);

export async function loadDiscoverPageData(searchParams: DiscoverSearchParams): Promise<DiscoverPageData> {
  const weeks = clampWeeks(searchParams.weeks);
  const likedOnly = searchParams.liked === "1";
  const windowStart = new Date();
  const windowEnd = addWeeks(windowStart, weeks);
  const windowStartIso = windowStart.toISOString();
  const windowEndIso = windowEnd.toISOString();

  const supabase = await createClient();
  const cookieStore = await cookies();
  const hasSupabaseAuthCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.includes("sb-") && cookie.name.includes("auth-token"));

  const userPromise = hasSupabaseAuthCookie
    ? supabase.auth.getUser().then((result) => result.data.user)
    : Promise.resolve(null);

  const [initialPublicData, user] = await Promise.all([
    loadDiscoverPublicDataCached(windowStartIso, windowEndIso),
    userPromise,
  ]);
  let publicData = initialPublicData;
  // Ensure enough discover content on first load: grow window until at least 12 events (unless liked-only).
  if (!likedOnly) {
    let fetchWeeks = weeks;
    while (fetchWeeks < MAX_WEEKS) {
      const total = publicData.dbParties.length + publicData.externalParties.length + publicData.communityHangouts.length;
      if (total >= MIN_DISCOVER_EVENTS_ON_ENTRY) break;
      fetchWeeks = Math.min(MAX_WEEKS, fetchWeeks + 4);
      const expandedEndIso = addWeeks(windowStart, fetchWeeks).toISOString();
      const expanded = await loadDiscoverPublicDataCached(windowStartIso, expandedEndIso);
      publicData = mergeDiscoverPublicData(publicData, expanded);
    }
  }

  const { dbParties, externalParties, communityHangouts } = publicData;

  const parties = [...dbParties, ...communityHangouts, ...externalParties];
  const canLoadMore = weeks < MAX_WEEKS;

  const eventIds = parties.map((party) => party.id);
  const upvoteCountMap = new Map<string, number>();
  const upvotedByMe = new Set<string>();

  const [enrichedDbParties, upvotesResult] = await Promise.all([
    enrichPartiesForDiscover(dbParties),
    eventIds.length
      ? supabase
          .from("event_upvotes")
          .select("event_id, user_id")
          .in("event_id", eventIds)
      : Promise.resolve({
          data: [] as Array<{ event_id: string; user_id: string | null }>,
          error: null as null,
        }),
  ]);

  if (!upvotesResult.error) {
    for (const row of (upvotesResult.data ?? []) as Array<{ event_id: string; user_id: string | null }>) {
      const current = upvoteCountMap.get(row.event_id) ?? 0;
      upvoteCountMap.set(row.event_id, current + 1);

      if (user && row.user_id === user.id) {
        upvotedByMe.add(row.event_id);
      }
    }
  }

  // Fill low/empty counts with deterministic traffic-based estimates
  // so discover ranking and social proof look realistic before enough real usage accumulates.
  const modeledUpvotes = applyTrafficBasedUpvoteEstimates(parties, upvoteCountMap);

  const partiesWithHostData = [...enrichedDbParties, ...communityHangouts, ...externalParties];
  const partiesWithHeroImages = await enrichPartiesWithDiscoverHeroImages(partiesWithHostData);

  const partiesWithUpvotes = partiesWithHeroImages.map((party) => ({
    ...party,
    upvote_count: modeledUpvotes.get(party.id) ?? upvoteCountMap.get(party.id) ?? 0,
    upvoted_by_me: upvotedByMe.has(party.id),
  }));

  const scopedParties =
    likedOnly && user
      ? partiesWithUpvotes.filter((party) => party.upvoted_by_me === true)
      : partiesWithUpvotes;

  const discoverEvents = scopedParties.map(mapPartyCardToDiscoverEvent);

  const avatarFallback = String(user?.email?.[0] ?? "G").toUpperCase();
  const initialView: DiscoverViewMode =
    searchParams.view === "calendar" ||
    searchParams.view === "map" ||
    searchParams.view === "list" ||
    searchParams.view === "cards"
      ? searchParams.view
      : "cards";
  const initialFilter =
    searchParams.type === "community" ||
    searchParams.type === "top" ||
    searchParams.type === "clubs" ||
    searchParams.type === "daytime" ||
    searchParams.type === "all"
      ? searchParams.type
      : "all";
  const initialCalendarDate =
    typeof searchParams.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : "";

  return {
    parties: discoverEvents,
    avatarFallback,
    isAuthenticated: Boolean(user),
    canLoadMore,
    currentWeeks: weeks,
    initialView,
    initialFilter,
    initialCalendarDate,
  };
}
