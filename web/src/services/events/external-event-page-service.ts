import { getCommunityHangoutById, getExternalEventById, getPublicPartyById } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { sanitizeExternalEventTitle } from "@/lib/sanitize-event-title";

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
  const displayTitle = sanitizeExternalEventTitle(baseEvent.title, {
    description: baseEvent.description,
    externalLink: baseEvent.externalLink,
    fallback: baseEvent.vibeLabel || baseEvent.locationName || "Event",
  });
  const event = { ...baseEvent, title: displayTitle };
  const displayLocationName = event.locationName ?? "Ort wird noch ergaenzt";
  const clubName = event.locationName?.trim() || event.vibeLabel.trim() || "Tuebingen";
  const kindLabel = formatEventKindLabel(event.kind);
  const schemaDescription =
    event.description?.trim() ||
    `${event.title} im ${clubName} am ${formatDateTime(event.startsAt)} in Tuebingen.`;

  return {
    ...event,
    kindLabel,
    clubName,
    displayLocationName,
    displayCategory: event.musicGenre ?? event.categoryLabel ?? event.vibeLabel,
    heroDateLabel: formatDateTime(event.startsAt),
    startDateLabel: formatFullDateTime(event.startsAt),
    endDateLabel: formatFullDateTime(event.endsAt),
    coordinatesLabel: formatCoordinates(event.publicLat, event.publicLng),
    mapsLink:
      event.publicLat != null && event.publicLng != null
        ? `https://www.google.com/maps/search/?api=1&query=${event.publicLat},${event.publicLng}`
        : null,
    seoDescription: event.description?.trim()
      ? truncateDescription(event.description)
      : truncateDescription(
          `${event.title} in Tuebingen als ${kindLabel} am ${formatDateTime(event.startsAt)}.`,
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
