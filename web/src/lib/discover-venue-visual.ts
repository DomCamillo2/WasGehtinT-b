import type { DiscoverEvent } from "@/services/discover/discover-view-model";

const PARTNER_LOGOS: Array<{ match: RegExp; src: string; alt: string }> = [
  { match: /kuckuck/i, src: "/logos/venues/kuckuck.svg", alt: "Kuckuck Logo" },
  { match: /schlachthaus/i, src: "/logos/venues/schlachthaus.svg", alt: "Schlachthaus Logo" },
  { match: /clubhaus/i, src: "/logos/venues/clubhaus.svg", alt: "Clubhaus Logo" },
  {
    match: /frau\s*holle|frauholle|frau_holle_tuebingen|holle\s*t(?:ue|u)bingen|haaggasse\s*15\/?2/i,
    src: "/logos/venues/frau-holle.svg",
    alt: "Frau Holle Icon",
  },
  {
    match: /schwarzes\s*schaf|schwarzes[-_.\s]*schaf|schwarzesschaf\.tuebingen|schwarzes_schaf_tuebingen|schwarzesschaf_tuebingen/i,
    src: "/logos/venues/schwarzes-schaf.svg",
    alt: "Schwarzes Schaf Icon",
  },
];

/**
 * Local partner venue mark stored under /public/logos/venues (SVG).
 * Extend when new assets are added (e.g. Epplehaus).
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
