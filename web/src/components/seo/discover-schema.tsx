import { DiscoverEvent } from "@/services/discover/discover-view-model";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site-config";

type Props = {
  events: DiscoverEvent[];
};

const SITE_IMAGE = `${SITE_URL}/Logo.png`;

function truncateText(value: string | null, maxLength = 220) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function getEventUrl(event: DiscoverEvent) {
  return absoluteUrl(event.detailHref);
}

function toSchemaLocation(event: DiscoverEvent) {
  const placeName = event.locationName?.trim() || event.vibeLabel.trim() || "Tuebingen";

  return {
    "@type": "Place",
    name: placeName,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Tuebingen",
      addressRegion: "Baden-Wuerttemberg",
      addressCountry: "DE",
    },
    geo:
      event.publicLat != null && event.publicLng != null
        ? {
            "@type": "GeoCoordinates",
            latitude: event.publicLat,
            longitude: event.publicLng,
          }
        : undefined,
  };
}

function toOffers(event: DiscoverEvent, eventUrl: string) {
  const isFree =
    event.contributionCents === 0 ||
    event.priceInfo?.toLowerCase().includes("free") === true ||
    event.priceInfo?.toLowerCase().includes("kostenlos") === true;

  const price = isFree ? "0" : (event.contributionCents / 100).toFixed(2);

  return {
    "@type": "Offer",
    price,
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: event.externalLink ?? eventUrl,
  };
}

function toEventListItem(event: DiscoverEvent, position: number) {
  const url = getEventUrl(event);
  const description =
    truncateText(event.description) ||
    `${event.title} in Tuebingen am ${new Date(event.startsAt).toISOString()}.`;

  const organizerName = event.sourceBadge?.trim() || event.locationName?.trim() || SITE_NAME;
  const organizerUrl = event.externalLink ?? absoluteUrl("/discover");

  return {
    "@type": "ListItem",
    position,
    url,
    name: event.title,
    item: {
      "@type": "Event",
      name: event.title,
      startDate: event.startsAt,
      endDate: event.endsAt || event.startsAt,
      description,
      image: SITE_IMAGE,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: toSchemaLocation(event),
      offers: toOffers(event, url),
      organizer: {
        "@type": "Organization",
        name: organizerName,
        url: organizerUrl,
      },
      ...(event.musicGenre
        ? {
            performer: {
              "@type": "PerformingGroup",
              name: event.musicGenre,
            },
          }
        : {}),
      url,
    },
  };
}

export function DiscoverSchema({ events }: Props) {
  const indexedEvents = events.slice(0, 24);
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Was geht in Tuebingen heute? Partys, Clubs und Events",
    description:
      "Oeffentliche Event-Uebersicht fuer Tuebingen mit Studentenpartys, Clubnaechten, Community-Treffen und Tagesevents.",
    url: absoluteUrl("/discover"),
    inLanguage: "de-DE",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    mainEntity: {
      "@type": "ItemList",
      name: "Aktuelle Events in Tuebingen",
      numberOfItems: indexedEvents.length,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      itemListElement: indexedEvents.map((event, index) => toEventListItem(event, index + 1)),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
