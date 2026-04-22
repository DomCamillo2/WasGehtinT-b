import { getCommunityHangoutById, getExternalEventById, getPublicPartyById } from "@/lib/data";

export type PublicEventPageModel = {
  id: string;
  kind: "external" | "party" | "community";
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  publicLat: number | null;
  publicLng: number | null;
  externalLink: string | null;
  vibeLabel: string;
  locationName: string | null;
  musicGenre: string | null;
  categoryLabel: string | null;
  priceInfo: string | null;
  sourceBadge: string | null;
  isCommunity: boolean;
  isExternal: boolean;
};

export async function loadExternalEventPageData(eventId: string): Promise<PublicEventPageModel | null> {
  const externalEvent = await getExternalEventById(eventId);
  if (externalEvent) {
    return {
      id: externalEvent.id,
      kind: "external",
      title: externalEvent.title,
      description: externalEvent.description ?? null,
      startsAt: externalEvent.starts_at,
      endsAt: externalEvent.ends_at,
      publicLat: externalEvent.public_lat ?? null,
      publicLng: externalEvent.public_lng ?? null,
      externalLink: externalEvent.external_link ?? null,
      vibeLabel: externalEvent.vibe_label,
      locationName: externalEvent.location_name ?? null,
      musicGenre: externalEvent.music_genre ?? null,
      categoryLabel: externalEvent.category_label ?? null,
      priceInfo: externalEvent.price_info ?? null,
      sourceBadge: externalEvent.source_badge ?? null,
      isCommunity: false,
      isExternal: true,
    };
  }

  const publicParty = await getPublicPartyById(eventId);
  if (publicParty) {
    return {
      id: publicParty.id,
      kind: "party",
      title: publicParty.title,
      description: publicParty.description ?? null,
      startsAt: publicParty.starts_at,
      endsAt: publicParty.ends_at,
      publicLat: publicParty.public_lat ?? null,
      publicLng: publicParty.public_lng ?? null,
      externalLink: publicParty.external_link ?? null,
      vibeLabel: publicParty.vibe_label,
      locationName: publicParty.location_name ?? null,
      musicGenre: publicParty.music_genre ?? null,
      categoryLabel: publicParty.category_label ?? null,
      priceInfo: publicParty.price_info ?? null,
      sourceBadge: publicParty.source_badge ?? null,
      isCommunity: false,
      isExternal: false,
    };
  }

  const communityEvent = await getCommunityHangoutById(eventId);
  if (communityEvent) {
    return {
      id: communityEvent.id,
      kind: "community",
      title: communityEvent.title,
      description: communityEvent.description ?? null,
      startsAt: communityEvent.starts_at,
      endsAt: communityEvent.ends_at,
      publicLat: communityEvent.public_lat ?? null,
      publicLng: communityEvent.public_lng ?? null,
      externalLink: communityEvent.external_link ?? null,
      vibeLabel: communityEvent.vibe_label,
      locationName: communityEvent.location_name ?? null,
      musicGenre: communityEvent.music_genre ?? null,
      categoryLabel: communityEvent.category_label ?? null,
      priceInfo: communityEvent.price_info ?? null,
      sourceBadge: communityEvent.source_badge ?? null,
      isCommunity: true,
      isExternal: false,
    };
  }

  return null;
}
