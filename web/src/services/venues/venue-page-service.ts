import {
  getCommunityHangoutsForDiscover,
  getExternalEvents,
  getPublicParties,
} from "@/lib/data";
import type { PartyCard } from "@/lib/types";
import { getVenueDefinition } from "@/lib/venues-catalog";
import { getSupabasePublicServerClient } from "@/lib/supabase/public-server";

const FETCH_LIMIT = 800;

export type VenuePageModel = {
  slug: string;
  shortName: string;
  seoName: string;
  metaDescription: string;
  events: PartyCard[];
};

export async function loadVenuePageData(slug: string): Promise<VenuePageModel | null> {
  const venue = getVenueDefinition(slug);
  if (!venue) return null;

  const supabase = getSupabasePublicServerClient();
  const nowIso = new Date().toISOString();

  const [publicParties, externalEvents, community] = await Promise.all([
    getPublicParties({ fromIso: nowIso, limit: FETCH_LIMIT }, supabase),
    getExternalEvents({ fromIso: nowIso, limit: FETCH_LIMIT }, supabase),
    getCommunityHangoutsForDiscover({ fromIso: nowIso, limit: FETCH_LIMIT }, supabase),
  ]);

  const merged: PartyCard[] = [];
  const seen = new Set<string>();
  for (const row of [...publicParties, ...externalEvents, ...community]) {
    const id = String(row.id);
    if (seen.has(id)) continue;
    if (!venue.matches(row)) continue;
    seen.add(id);
    merged.push(row);
  }

  merged.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return {
    slug: venue.slug,
    shortName: venue.shortName,
    seoName: venue.seoName,
    metaDescription: venue.metaDescription,
    events: merged,
  };
}
