import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { DiscoverPremium } from "@/components/party/discover-premium";
import { getCommunityHangoutsForDiscover, getExternalEvents, getPublicParties } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { PartyCard } from "@/lib/types";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Was geht in Tuebingen heute? Partys, Clubs und Events",
  description:
    "Finde heraus, was in Tuebingen heute geht: Studentenpartys, Clubs, Community-Treffen und ausgewaehlte Tagesevents in einer mobilen Uebersicht.",
  alternates: {
    canonical: "/discover",
  },
  openGraph: {
    title: "Was geht in Tuebingen heute? Partys, Clubs und Events",
    description:
      "Alle wichtigen Partys, Clubs und Events in Tuebingen heute auf einen Blick.",
    url: "/discover",
    type: "website",
  },
};

async function enrichPartiesForDiscover(parties: PartyCard[]): Promise<PartyCard[]> {
  if (!parties.length) {
    return parties;
  }

  const supabase = await createClient();
  const partyIds = parties.map((party) => party.id);

  const { data: partyRows, error: partyRowsError } = await supabase
    .from("parties")
    .select("id, host_user_id, location_name")
    .in("id", partyIds);

  const fallbackPartyRowsResult = await (partyRowsError
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

  const hostIds = Array.from(
    new Set(
      safePartyRows
        .map((row) => row.host_user_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  let avatarMap = new Map<string, string>();
  if (hostIds.length > 0) {
    const avatarResult = await supabase
      .from("user_profiles")
      .select("id, avatar_url, profile_visibility")
      .in("id", hostIds);

    if (!avatarResult.error) {
      avatarMap = new Map(
        (
          (avatarResult.data ?? []) as Array<{
            id: string;
            avatar_url: string | null;
            profile_visibility?: "public" | "members" | "hidden" | null;
          }>
        )
          .filter(
            (row) =>
              typeof row.avatar_url === "string" &&
              row.avatar_url.length > 0 &&
              row.profile_visibility !== "hidden",
          )
          .map((row) => [row.id, row.avatar_url as string]),
      );
    }
  }

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

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; type?: string }>;
}) {
  void searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [dbParties, externalParties, communityHangouts] = await Promise.all([
    getPublicParties(),
    getExternalEvents(),
    getCommunityHangoutsForDiscover(),
  ]);

  const enrichedDbParties = await enrichPartiesForDiscover(dbParties);
  const parties = [...enrichedDbParties, ...communityHangouts, ...externalParties];

  const eventIds = parties.map((party) => party.id);
  const upvoteCountMap = new Map<string, number>();
  const upvotedByMe = new Set<string>();

  if (eventIds.length) {
    const genericCountResult = await supabase
      .from("event_upvotes")
      .select("event_id")
      .in("event_id", eventIds);

    if (!genericCountResult.error) {
      for (const row of (genericCountResult.data ?? []) as Array<{ event_id: string }>) {
        const current = upvoteCountMap.get(row.event_id) ?? 0;
        upvoteCountMap.set(row.event_id, current + 1);
      }
    }

    if (user) {
      const myUpvotesResult = await supabase
        .from("event_upvotes")
        .select("event_id")
        .eq("user_id", user.id)
        .in("event_id", eventIds);

      if (!myUpvotesResult.error) {
        for (const row of (myUpvotesResult.data ?? []) as Array<{ event_id: string }>) {
          upvotedByMe.add(row.event_id);
        }
      }
    } else {
      const cookieStore = await cookies();
      const anonSessionId = cookieStore.get("anon_session_id")?.value;

      if (anonSessionId) {
        const anonUpvotesResult = await supabase
          .from("event_upvotes")
          .select("event_id")
          .eq("anonymous_session_id", anonSessionId)
          .in("event_id", eventIds);

        if (!anonUpvotesResult.error) {
          for (const row of (anonUpvotesResult.data ?? []) as Array<{ event_id: string }>) {
            upvotedByMe.add(row.event_id);
          }
        }
      }
    }
  }

  const partiesWithUpvotes = parties.map((party) => {
    return {
      ...party,
      upvote_count: upvoteCountMap.get(party.id) ?? 0,
      upvoted_by_me: upvotedByMe.has(party.id),
    };
  });

  const avatarFallback = String(user?.email?.[0] ?? "G").toUpperCase();

  return (
    <AppShell>
      <DiscoverPremium
        parties={partiesWithUpvotes}
        avatarFallback={avatarFallback}
        isAuthenticated={Boolean(user)}
      />
    </AppShell>
  );
}
