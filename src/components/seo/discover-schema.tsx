import { DiscoverEvent } from "@/services/discover/discover-view-model";
import { SITE_NAME, absoluteUrl } from "@/lib/site-config";

type Props = {
  events: DiscoverEvent[];
};

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

function toEventListItem(event: DiscoverEvent, position: number) {
  const url = getEventUrl(event);
  const description =
    truncateText(event.description) ||
    `${event.title} in Tuebingen am ${new Date(event.startsAt).toISOString()}.`;

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
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: toSchemaLocation(event),
      organizer: {
        "@type": "Organization",
        name: event.sourceBadge?.trim() || event.locationName?.trim() || SITE_NAME,
      },
      url,
      isAccessibleForFree:
        event.contributionCents === 0 ||
        event.priceInfo?.toLowerCase().includes("free") === true ||
        event.priceInfo?.toLowerCase().includes("kostenlos") === true,
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
