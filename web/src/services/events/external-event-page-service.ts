import { getCommunityHangoutById, getExternalEventById, getPublicPartyById } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

function formatEventKindLabel(kind: "external" | "party" | "community"): string {
  if (kind === "party") {
    return "Party";
  }

  if (kind === "community") {
    return "Community Event";
  }

  return "Externes Event";
}

function formatFullDateTime(input: string): string {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return "Datum offen";
  }

  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "full",
    timeStyle: "short",
  }).format(parsed);
}

function formatCoordinates(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) {
    return null;
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function truncateDescription(text: string, maxLength = 150): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function buildPresentationModel(baseEvent: PublicEventPageModel): PublicEventPageData {
  const displayLocationName = baseEvent.locationName ?? "Ort wird noch ergaenzt";
  const clubName = baseEvent.locationName?.trim() || baseEvent.vibeLabel.trim() || "Tuebingen";
  const kindLabel = formatEventKindLabel(baseEvent.kind);
  const schemaDescription =
    baseEvent.description?.trim() ||
    `${baseEvent.title} im ${clubName} am ${formatDateTime(baseEvent.startsAt)} in Tuebingen.`;

  return {
    ...baseEvent,
    kindLabel,
    clubName,
    displayLocationName,
    displayCategory: baseEvent.musicGenre ?? baseEvent.categoryLabel ?? baseEvent.vibeLabel,
    heroDateLabel: formatDateTime(baseEvent.startsAt),
    startDateLabel: formatFullDateTime(baseEvent.startsAt),
    endDateLabel: formatFullDateTime(baseEvent.endsAt),
    coordinatesLabel: formatCoordinates(baseEvent.publicLat, baseEvent.publicLng),
    mapsLink:
      baseEvent.publicLat != null && baseEvent.publicLng != null
        ? `https://www.google.com/maps/search/?api=1&query=${baseEvent.publicLat},${baseEvent.publicLng}`
        : null,
    seoDescription: baseEvent.description?.trim()
      ? truncateDescription(baseEvent.description)
      : truncateDescription(
          `${baseEvent.title} in Tuebingen als ${kindLabel} am ${formatDateTime(baseEvent.startsAt)}.`,
        ),
    schemaDescription,
  };
}

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

export type PublicEventPageData = PublicEventPageModel & {
  kindLabel: string;
  clubName: string;
  displayLocationName: string;
  displayCategory: string;
  heroDateLabel: string;
  startDateLabel: string;
  endDateLabel: string;
  coordinatesLabel: string | null;
  mapsLink: string | null;
  seoDescription: string;
  schemaDescription: string;
};

export async function loadExternalEventPageData(eventId: string): Promise<PublicEventPageData | null> {
  const externalEvent = await getExternalEventById(eventId);
  if (externalEvent) {
    return buildPresentationModel({
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
    });
  }

  const publicParty = await getPublicPartyById(eventId);
  if (publicParty) {
    return buildPresentationModel({
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
    });
  }

  const communityEvent = await getCommunityHangoutById(eventId);
  if (communityEvent) {
    return buildPresentationModel({
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
    });
  }

  return null;
}
