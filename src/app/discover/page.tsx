import { fetchExternalEventsAction } from "@/app/actions/external-events";
import { AppShell } from "@/components/layout/app-shell";
import { DiscoverPremium } from "@/components/party/discover-premium";
import { getPublicParties, requireUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { PartyCard } from "@/lib/types";

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
      .select("id, avatar_url")
      .in("id", hostIds);

    if (!avatarResult.error) {
      avatarMap = new Map(
        ((avatarResult.data ?? []) as Array<{ id: string; avatar_url: string | null }>)
          .filter((row) => typeof row.avatar_url === "string" && row.avatar_url.length > 0)
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
  const { user } = await requireUser();

  const [dbParties, externalParties] = await Promise.all([
    getPublicParties(),
    fetchExternalEventsAction(),
  ]);

  const enrichedDbParties = await enrichPartiesForDiscover(dbParties);
  const parties = [...enrichedDbParties, ...externalParties];
  const avatarFallback = (user.email?.[0] ?? "U").toUpperCase();

  return (
    <AppShell>
      <DiscoverPremium parties={parties} avatarFallback={avatarFallback} />
    </AppShell>
  );
}
