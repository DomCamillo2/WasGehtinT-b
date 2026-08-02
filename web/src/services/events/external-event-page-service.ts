import { getCommunityHangoutById, getExternalEventById, getExternalEvents, getPublicPartyById } from "@/lib/data";
import { assignDiscoverHeroUrlsForParties } from "@/lib/discover-event-images";
import { formatDateTime } from "@/lib/format";
import { sanitizeExternalEventTitle } from "@/lib/sanitize-event-title";
import {
  resolveTuebingenCityFallback,
  resolveTuebingenVenueCoordsFromText,
} from "@/lib/tuebingen-venues";
import type { PartyCard } from "@/lib/types";

function formatEventKindLabel(kind: "external" | "party" | "community"): string {
  if (kind === "party") return "Party";
  if (kind === "community") return "Community Event";
  return "Event in Tübingen";
}

function formatFullDateTime(input: string): string {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return "Datum offen";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "full",
    timeStyle: "short",
  }).format(parsed);
}

function formatWeekdayDate(input: string): string {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return "Datum offen";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatClock(input: string): string {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return "offen";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatDurationLabel(startsAt: string, endsAt: string, isAllDay: boolean): string | null {
  if (isAllDay) return "Ganztägig";
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `ca. ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "ca. 1 Std." : `ca. ${hours} Std.`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 Tag" : `${days} Tage`;
}

function formatScopeLabel(scope: "nightlife" | "daytime" | "mixed" | null): string | null {
  if (scope === "nightlife") return "Nachtleben";
  if (scope === "daytime") return "Tagsüber";
  if (scope === "mixed") return "Tag & Nacht";
  return null;
}

function formatCoordinates(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function truncateDescription(text: string, maxLength = 150): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function isWeakDescription(description: string | null, title: string): boolean {
  if (!description) return true;
  const normalized = description.replace(/\s+/g, " ").trim();
  if (normalized.length < 48) return true;
  if (normalized.toLowerCase() === title.trim().toLowerCase()) return true;
  // Common scraper stubs: "Club Voltaire Tübingen – Party"
  if (/^[^-–—]{0,40}[-–—]\s*(party|event|konzert|disco)\s*$/i.test(normalized)) return true;
  return false;
}

function resolveCoords(base: {
  publicLat: number | null;
  publicLng: number | null;
  locationName: string | null;
  title: string;
  description: string | null;
}): { lat: number | null; lng: number | null; fromVenueMatch: boolean } {
  if (base.publicLat != null && base.publicLng != null) {
    return { lat: base.publicLat, lng: base.publicLng, fromVenueMatch: false };
  }
  const probe = [base.locationName, base.title, base.description].filter(Boolean).join(" ");
  const matched = resolveTuebingenVenueCoordsFromText(probe);
  if (matched) {
    return { lat: matched.coords.lat, lng: matched.coords.lng, fromVenueMatch: true };
  }
  const city = resolveTuebingenCityFallback(probe);
  if (city) {
    return { lat: city.lat, lng: city.lng, fromVenueMatch: true };
  }
  return { lat: null, lng: null, fromVenueMatch: false };
}

function toPartyCard(model: PublicEventPageModel): PartyCard {
  return {
    id: model.id,
    title: model.title,
    description: model.description,
    starts_at: model.startsAt,
    ends_at: model.endsAt,
    max_guests: 0,
    contribution_cents: 0,
    public_lat: model.publicLat,
    public_lng: model.publicLng,
    is_external: model.isExternal,
    external_link: model.externalLink,
    vibe_label: model.vibeLabel,
    spots_left: 0,
    location_name: model.locationName,
    music_genre: model.musicGenre,
    category_slug: model.categorySlug,
    category_label: model.categoryLabel,
    event_scope: model.eventScope,
    is_all_day: model.isAllDay,
    audience_label: model.audienceLabel,
    price_info: model.priceInfo,
    source_badge: model.sourceBadge,
    is_community: model.isCommunity,
  };
}

function mapRawToModel(
  raw: PartyCard,
  kind: "external" | "party" | "community",
): PublicEventPageModel {
  return {
    id: raw.id,
    kind,
    title: raw.title,
    description: raw.description ?? null,
    startsAt: raw.starts_at,
    endsAt: raw.ends_at,
    publicLat: raw.public_lat ?? null,
    publicLng: raw.public_lng ?? null,
    externalLink: raw.external_link ?? null,
    vibeLabel: raw.vibe_label,
    locationName: raw.location_name ?? null,
    musicGenre: raw.music_genre ?? null,
    categorySlug: raw.category_slug ?? null,
    categoryLabel: raw.category_label ?? null,
    eventScope: raw.event_scope ?? null,
    isAllDay: raw.is_all_day === true,
    audienceLabel: raw.audience_label ?? null,
    priceInfo: raw.price_info ?? null,
    sourceBadge: raw.source_badge ?? null,
    isCommunity: kind === "community" || raw.is_community === true,
    isExternal: kind === "external" || raw.is_external === true,
  };
}

function buildPresentationModel(
  baseEvent: PublicEventPageModel,
  related: PublicEventRelatedItem[],
): PublicEventPageData {
  const displayTitle = sanitizeExternalEventTitle(baseEvent.title, {
    description: baseEvent.description,
    externalLink: baseEvent.externalLink,
    fallback: baseEvent.vibeLabel || baseEvent.locationName || "Event",
  });
  const event = { ...baseEvent, title: displayTitle };
  const coords = resolveCoords(event);
  const displayLocationName = event.locationName ?? "Ort wird noch ergänzt";
  const clubName = event.locationName?.trim() || event.vibeLabel.trim() || "Tübingen";
  const kindLabel = formatEventKindLabel(event.kind);
  const weakDescription = isWeakDescription(event.description, event.title);
  const schemaDescription =
    event.description?.trim() ||
    `${event.title} im ${clubName} am ${formatDateTime(event.startsAt)} in Tübingen.`;

  const heroById = assignDiscoverHeroUrlsForParties([toPartyCard(event)]);
  const sameDay =
    formatWeekdayDate(event.startsAt) === formatWeekdayDate(event.endsAt) && !event.isAllDay;

  const facts: PublicEventFact[] = [
    {
      label: "Wann",
      value: event.isAllDay
        ? `${formatWeekdayDate(event.startsAt)} · ganztägig`
        : sameDay
          ? `${formatWeekdayDate(event.startsAt)} · ${formatClock(event.startsAt)}–${formatClock(event.endsAt)}`
          : `${formatFullDateTime(event.startsAt)} → ${formatFullDateTime(event.endsAt)}`,
    },
    { label: "Wo", value: displayLocationName },
  ];
  if (event.musicGenre || event.categoryLabel || event.vibeLabel) {
    facts.push({
      label: "Was",
      value: event.musicGenre ?? event.categoryLabel ?? event.vibeLabel,
    });
  }
  if (event.priceInfo) facts.push({ label: "Preis", value: event.priceInfo });
  if (event.audienceLabel) facts.push({ label: "Für wen", value: event.audienceLabel });
  if (event.sourceBadge) facts.push({ label: "Quelle", value: event.sourceBadge });

  return {
    ...event,
    kindLabel,
    clubName,
    displayLocationName,
    displayCategory: event.musicGenre ?? event.categoryLabel ?? event.vibeLabel,
    heroDateLabel: formatDateTime(event.startsAt),
    startDateLabel: formatFullDateTime(event.startsAt),
    endDateLabel: formatFullDateTime(event.endsAt),
    weekdayLabel: formatWeekdayDate(event.startsAt),
    startTimeLabel: formatClock(event.startsAt),
    endTimeLabel: formatClock(event.endsAt),
    durationLabel: formatDurationLabel(event.startsAt, event.endsAt, event.isAllDay),
    scopeLabel: formatScopeLabel(event.eventScope),
    weakDescription,
    facts,
    publicLat: coords.lat,
    publicLng: coords.lng,
    coordinatesLabel: formatCoordinates(coords.lat, coords.lng),
    mapsLink:
      coords.lat != null && coords.lng != null
        ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
        : null,
    openStreetMapLink:
      coords.lat != null && coords.lng != null
        ? `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`
        : null,
    coordsEstimated: coords.fromVenueMatch,
    heroImageUrl: heroById[event.id] ?? null,
    seoDescription: !weakDescription && event.description?.trim()
      ? truncateDescription(event.description)
      : truncateDescription(
          `${event.title} in Tübingen (${kindLabel}) am ${formatDateTime(event.startsAt)} · ${displayLocationName}.`,
        ),
    schemaDescription,
    relatedEvents: related,
  };
}

async function loadRelatedEvents(event: PublicEventPageModel): Promise<PublicEventRelatedItem[]> {
  const locationKey = (event.locationName ?? "").trim().toLowerCase();
  const sourceKey = (event.sourceBadge ?? "").trim().toLowerCase();
  if (!locationKey && !sourceKey) return [];

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const until = new Date(from);
  until.setDate(until.getDate() + 56);

  const pool = await getExternalEvents({
    fromIso: from.toISOString(),
    untilIso: until.toISOString(),
    limit: 100,
  });

  return pool
    .filter((item) => {
      if (item.id === event.id) return false;
      const loc = (item.location_name ?? "").trim().toLowerCase();
      const src = (item.source_badge ?? "").trim().toLowerCase();
      if (locationKey && loc && loc === locationKey) return true;
      if (sourceKey && src && src === sourceKey) return true;
      return false;
    })
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      title: sanitizeExternalEventTitle(item.title, {
        description: item.description,
        externalLink: item.external_link,
        fallback: item.vibe_label || item.location_name || "Event",
      }),
      detailHref: `/event/${item.id}`,
      whenLabel: formatDateTime(item.starts_at),
      venueLabel: item.location_name ?? item.vibe_label,
    }));
}

export type PublicEventFact = {
  label: string;
  value: string;
};

export type PublicEventRelatedItem = {
  id: string;
  title: string;
  detailHref: string;
  whenLabel: string;
  venueLabel: string;
};

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
  categorySlug: string | null;
  categoryLabel: string | null;
  eventScope: "nightlife" | "daytime" | "mixed" | null;
  isAllDay: boolean;
  audienceLabel: string | null;
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
  weekdayLabel: string;
  startTimeLabel: string;
  endTimeLabel: string;
  durationLabel: string | null;
  scopeLabel: string | null;
  weakDescription: boolean;
  facts: PublicEventFact[];
  coordinatesLabel: string | null;
  mapsLink: string | null;
  openStreetMapLink: string | null;
  coordsEstimated: boolean;
  heroImageUrl: string | null;
  seoDescription: string;
  schemaDescription: string;
  relatedEvents: PublicEventRelatedItem[];
};

export async function loadExternalEventPageData(eventId: string): Promise<PublicEventPageData | null> {
  const externalEvent = await getExternalEventById(eventId);
  if (externalEvent) {
    const model = mapRawToModel(externalEvent, "external");
    const related = await loadRelatedEvents(model);
    return buildPresentationModel(model, related);
  }

  const publicParty = await getPublicPartyById(eventId);
  if (publicParty) {
    const model = mapRawToModel(publicParty, "party");
    const related = await loadRelatedEvents(model);
    return buildPresentationModel(model, related);
  }

  const communityEvent = await getCommunityHangoutById(eventId);
  if (communityEvent) {
    const model = mapRawToModel(communityEvent, "community");
    const related = await loadRelatedEvents(model);
    return buildPresentationModel(model, related);
  }

  return null;
}
