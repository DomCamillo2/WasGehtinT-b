import type { DiscoverEvent } from "@/services/discover/discover-view-model";

const PARTNER_LOGOS: Array<{ match: RegExp; src: string; alt: string }> = [
  { match: /kuckuck/i, src: "/logos/venues/kuckuck.png", alt: "Kuckuck Logo" },
  { match: /schlachthaus/i, src: "/logos/venues/schlachthaus.jpg", alt: "Schlachthaus Logo" },
  { match: /clubhaus/i, src: "/logos/venues/clubhaus.jpg", alt: "Clubhaus Logo" },
  {
    match: /frau\s*holle|frauholle|frau_holle_tuebingen|holle\s*t(?:ue|u)bingen|haaggasse\s*15\/?2/i,
    src: "/logos/venues/frauholle.jpg",
    alt: "Frau Holle Icon",
  },
  {
    match: /schwarzes\s*schaf|schwarzes[-_.\s]*schaf|schwarzesschaf\.tuebingen|schwarzes_schaf_tuebingen|schwarzesschaf_tuebingen/i,
    src: "/logos/venues/schwarzes-schaf.jpg",
    alt: "Schwarzes Schaf Icon",
  },
  { match: /epplehaus/i, src: "/logos/venues/epplehaus.jpg", alt: "Epplehaus Logo" },
];

/**
 * Local partner venue marks stored under /public/logos/venues.
 */
export function resolveDiscoverVenuePartnerLogo(party: DiscoverEvent): { src: string; alt: string } | null {
  const locationName = (party.locationName ?? "").trim();
  const probeText = `${locationName} ${party.vibeLabel} ${party.title} ${party.externalLink ?? ""}`;

  for (const partner of PARTNER_LOGOS) {
    if (partner.match.test(probeText)) {
      return { src: partner.src, alt: partner.alt };
    }
  }

  return null;
}
