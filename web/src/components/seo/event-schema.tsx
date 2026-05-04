import { SITE_URL, absoluteUrl } from "@/lib/site-config";

type Props = {
  name: string;
  startDate: string;
  endDate?: string | null;
  location: string;
  description: string;
  url: string;
  organizerName?: string | null;
  externalLink?: string | null;
  priceInfo?: string | null;
  musicGenre?: string | null;
};

const SITE_IMAGE = `${SITE_URL}/Logo.png`;

function isFreeEntry(priceInfo: string | null | undefined): boolean {
  if (!priceInfo) return false;
  const lower = priceInfo.toLowerCase();
  return lower.includes("frei") || lower.includes("kostenlos") || lower.includes("free") || lower === "0";
}

function extractPrice(priceInfo: string | null | undefined): string | null {
  if (!priceInfo) {
    return null;
  }

  if (isFreeEntry(priceInfo)) {
    return "0";
  }

  const normalized = priceInfo.replace(",", ".").trim();
  const match = normalized.match(/(\d+(?:\.\d{1,2})?)/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed.toFixed(2);
}

export function EventSchema({
  name,
  startDate,
  endDate,
  location,
  description,
  url,
  organizerName,
  externalLink,
  priceInfo,
  musicGenre,
}: Props) {
  const offerUrl = externalLink ?? url;
  const price = extractPrice(priceInfo);
  const offers = {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    url: offerUrl,
    ...(price !== null
      ? {
          price,
          priceCurrency: "EUR",
        }
      : {}),
  };

  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    startDate,
    endDate: endDate ?? startDate,
    description,
    image: SITE_IMAGE,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: location,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Tübingen",
        addressRegion: "Baden-Württemberg",
        addressCountry: "DE",
      },
    },
    offers,
    organizer: organizerName
      ? {
          "@type": "Organization",
          name: organizerName,
          url: externalLink ?? absoluteUrl("/discover"),
        }
      : {
          "@type": "Organization",
          name: "WasGehtTüb",
          url: absoluteUrl("/discover"),
        },
    ...(musicGenre
      ? {
          performer: {
            "@type": "PerformingGroup",
            name: musicGenre,
          },
        }
      : {}),
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
