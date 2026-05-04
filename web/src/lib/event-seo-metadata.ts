import type { Metadata } from "next";
import { SITE_NAME, absoluteUrl } from "@/lib/site-config";
import type { PublicEventPageData } from "@/services/events/external-event-page-service";

/** Berlin wall time for SERP snippets (matches user locale). */
function formatSeoEventDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function titleContainsTubingen(title: string): boolean {
  return /\bt(ü|ue)bingen\b/i.test(title);
}

/**
 * CTR-focused titles: city + date + venue + intent keywords for student audience.
 */
export function buildEventDetailMetadata(event: PublicEventPageData): Metadata {
  const canonicalUrl = absoluteUrl(`/event/${event.id}`);
  const datePart = formatSeoEventDate(event.startsAt);
  const cityTail = titleContainsTubingen(event.title) ? "" : " Tübingen";
  const primaryTitle = `${event.title}${cityTail}${datePart ? ` – ${datePart}` : ""} | ${event.clubName} · Termine & Infos`;

  const enrichedDescription =
    event.seoDescription.length >= 120
      ? event.seoDescription
      : `${event.title} am ${datePart || "kommenden Termin"} im ${event.clubName}: Datum, Ort${event.priceInfo ? ", Eintritt" : ""} und Link zum Veranstalter — jetzt in ${SITE_NAME} ansehen.`;

  return {
    title: primaryTitle,
    description: enrichedDescription.slice(0, 160),
    alternates: {
      canonical: canonicalUrl,
    },
    keywords: [
      `${event.clubName} Tübingen`,
      event.title,
      "Events Tübingen",
      "Studentenpartys Tübingen",
      event.musicGenre ?? "",
      event.categoryLabel ?? "",
    ].filter(Boolean),
    openGraph: {
      title: primaryTitle,
      description: enrichedDescription.slice(0, 200),
      url: canonicalUrl,
      type: "website",
      locale: "de_DE",
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: primaryTitle.slice(0, 70),
      description: enrichedDescription.slice(0, 160),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
