import type { PartyCard } from "@/lib/types";

/** Fields used to tie scraped events to a venue (head search / venue pages). */
export type VenueMatchSource = Pick<PartyCard, "title" | "vibe_label"> & {
  location_name?: string | null;
  external_link?: string | null;
};

export type VenueDefinition = {
  slug: string;
  /** Display name, e.g. "Clubhaus" */
  shortName: string;
  /** Full SEO name with city */
  seoName: string;
  metaDescription: string;
  /** Match events tied to this venue (location, vibe, links). */
  matches: (party: VenueMatchSource) => boolean;
};

function haystack(party: VenueMatchSource): string {
  return `${party.location_name ?? ""} ${party.vibe_label} ${party.title} ${party.external_link ?? ""}`.toLowerCase();
}

/**
 * Curated Tübingen venues that drive head / long-tail search (Clubhaus, Epplehaus, …).
 * Order: specificity first (longer regex patterns before loose ones).
 */
export const VENUE_DEFINITIONS: VenueDefinition[] = [
  {
    slug: "clubhaus",
    shortName: "Clubhaus",
    seoName: "Clubhaus Tübingen",
    metaDescription:
      "Alle Termine und Events im Clubhaus Tübingen — Partys, Konzerte und Clubnächte. Aktuelle Daten, Infos und Links zum Veranstalter.",
    matches: (party) => /clubhaus/i.test(haystack(party)),
  },
  {
    slug: "epplehaus",
    shortName: "Epplehaus",
    seoName: "Epplehaus Tübingen",
    metaDescription:
      "Programm und Termine im Epplehaus Tübingen: Kultur, Politik, Workshops und mehr — kompakte Übersicht mit Daten.",
    matches: (party) => /epplehaus/i.test(haystack(party)),
  },
  {
    slug: "schlachthaus",
    shortName: "Schlachthaus",
    seoName: "Schlachthaus Tübingen",
    metaDescription:
      "Events und Termine im Schlachthaus Tübingen: Konzerte, Partys und Live-Musik — Übersicht der nächsten Daten.",
    matches: (party) => /schlachthaus/i.test(haystack(party)),
  },
  {
    slug: "kuckuck",
    shortName: "Kuckuck",
    seoName: "Kuckuck Tübingen",
    metaDescription:
      "Termine im Kuckuck Tübingen — Partys und Events. Schnell Datum und Infos finden.",
    matches: (party) => /kuckuck/i.test(haystack(party)),
  },
  {
    slug: "frau-holle",
    shortName: "Frau Holle",
    seoName: "Frau Holle Tübingen",
    metaDescription:
      "Events bei Frau Holle Tübingen (Haaggasse): kommende Termine und Party-Infos auf einen Blick.",
    matches: (party) =>
      /\bfrau\s*holle|frauholle|haaggasse\s*15\/?2\b/i.test(haystack(party)),
  },
  {
    slug: "schwarzes-schaf",
    shortName: "Schwarzes Schaf",
    seoName: "Schwarzes Schaf Tübingen",
    metaDescription:
      "Termine im Schwarzen Schaf Tübingen — Events und Partys mit Datum und Kurzinfos.",
    matches: (party) => /schwarzes\s*schaf|schwarzesschaf/i.test(haystack(party)),
  },
  {
    slug: "sudhaus",
    shortName: "Sudhaus",
    seoName: "Sudhaus Tübingen",
    metaDescription:
      "Kultur- und Event-Termine im Sudhaus Tübingen: Übersicht kommender Veranstaltungen.",
    matches: (party) => /\bsudhaus\b/i.test(haystack(party)),
  },
];

const bySlug = new Map(VENUE_DEFINITIONS.map((v) => [v.slug, v]));

export function getVenueDefinition(slug: string): VenueDefinition | null {
  return bySlug.get(slug) ?? null;
}

export function listVenueSlugs(): string[] {
  return VENUE_DEFINITIONS.map((v) => v.slug);
}

/** First matching venue for cross-links from an event detail page. */
export function resolveVenueSlugFromSource(source: VenueMatchSource): string | null {
  for (const venue of VENUE_DEFINITIONS) {
    if (venue.matches(source)) return venue.slug;
  }
  return null;
}
