import { PartyCard } from "@/lib/types";

export type DiscoverEvent = {
  id: string;
  detailHref: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  maxGuests: number;
  contributionCents: number;
  publicLat: number | null;
  publicLng: number | null;
  isExternal: boolean;
  externalLink: string | null;
  vibeLabel: string;
  spotsLeft: number;
  locationName: string | null;
  hostUserId: string | null;
  hostAvatarUrl: string | null;
  musicGenre: string | null;
  categorySlug: string | null;
  categoryLabel: string | null;
  eventScope: "nightlife" | "daytime" | "mixed" | null;
  isAllDay: boolean;
  audienceLabel: string | null;
  priceInfo: string | null;
  upvoteCount: number;
  upvotedByMe: boolean;
  sourceBadge: string | null;
  isCommunity: boolean;
};

export function mapPartyCardToDiscoverEvent(party: PartyCard): DiscoverEvent {
  return {
    id: party.id,
    detailHref: `/event/${party.id}`,
    title: party.title,
    description: party.description,
    startsAt: party.starts_at,
    endsAt: party.ends_at,
    maxGuests: party.max_guests,
    contributionCents: party.contribution_cents,
    publicLat: party.public_lat ?? null,
    publicLng: party.public_lng ?? null,
    isExternal: party.is_external,
    externalLink: party.external_link ?? null,
    vibeLabel: party.vibe_label,
    spotsLeft: party.spots_left,
    locationName: party.location_name ?? null,
    hostUserId: party.host_user_id ?? null,
    hostAvatarUrl: party.host_avatar_url ?? null,
    musicGenre: party.music_genre ?? null,
    categorySlug: party.category_slug ?? null,
    categoryLabel: party.category_label ?? null,
    eventScope: party.event_scope ?? null,
    isAllDay: party.is_all_day === true,
    audienceLabel: party.audience_label ?? null,
    priceInfo: party.price_info ?? null,
    upvoteCount: Math.max(0, Number(party.upvote_count ?? 0)),
    upvotedByMe: party.upvoted_by_me === true,
    sourceBadge: party.source_badge ?? null,
    isCommunity: party.is_community === true,
  };
}
