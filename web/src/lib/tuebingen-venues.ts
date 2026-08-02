/**
 * Shared Tübingen venue coordinates — used by map resolution and scrapers.
 * Keep matching specific (avoid bare "markt" / "schaf" / "holle" false positives).
 */

export type TuebingenVenueCoords = { lat: number; lng: number };

export const TUEBINGEN_VENUE_COORDS = {
  kuckuck: { lat: 48.5413588, lng: 9.0599431 },
  clubhaus: { lat: 48.5243852, lng: 9.0605991 },
  schlachthaus: { lat: 48.5255, lng: 9.0515 },
  frauHolle: { lat: 48.5203906, lng: 9.051808 },
  schwarzesSchaf: { lat: 48.5212656, lng: 9.0574061 },
  epplehaus: { lat: 48.522317, lng: 9.048936 },
  blauerTurm: { lat: 48.5178, lng: 9.0601 },
  top10: { lat: 48.5145, lng: 9.0835 },
  sudhaus: { lat: 48.5065, lng: 9.0625 },
  clubVoltaire: { lat: 48.52055, lng: 9.05215 },
  dai: { lat: 48.52335, lng: 9.06055 },
  uni: { lat: 48.5296, lng: 9.0558 },
  uhlandstrasse: { lat: 48.52162, lng: 9.05496 },
  marktplatz: { lat: 48.52156, lng: 9.05774 },
  /** Fallback pin near Altstadt when we only know “Tübingen”. */
  tuebingenCenter: { lat: 48.5216, lng: 9.0576 },
} as const satisfies Record<string, TuebingenVenueCoords>;

type VenueMatcher = {
  key: keyof typeof TUEBINGEN_VENUE_COORDS;
  match: RegExp;
};

const VENUE_MATCHERS: VenueMatcher[] = [
  { key: "kuckuck", match: /\bkuckuck\b/i },
  { key: "clubhaus", match: /\bclubhaus\b/i },
  { key: "schlachthaus", match: /\bschlachthaus\b/i },
  {
    key: "frauHolle",
    match: /frau\s*holle|\bfrauholle\b|frau_holle|haaggasse\s*15/i,
  },
  {
    key: "schwarzesSchaf",
    match: /schwarzes\s*schaf|schwarzesschaf|schwarzes[-_.\s]*schaf/i,
  },
  { key: "epplehaus", match: /\bepplehaus\b/i },
  { key: "blauerTurm", match: /blauer\s*turm/i },
  { key: "top10", match: /\btop\s*10\b|\btop10\b/i },
  { key: "sudhaus", match: /\bsudhaus\b/i },
  { key: "clubVoltaire", match: /club\s*voltaire|\bvoltaire\b/i },
  { key: "dai", match: /\bd\.?a\.?i\.?\b|deutsch[- ]amerikanisches?\s*institut/i },
  {
    key: "uni",
    match: /universit[aä]t\s*t[uü]bingen|\buni[- ]?t[uü]bingen\b|uni\s*tübingen/i,
  },
  {
    key: "uhlandstrasse",
    match: /uhlandstra(ß|ss)e|flohmarkt/i,
  },
  {
    key: "marktplatz",
    match: /\bmarktplatz\b|\brathaus\b|wochenmarkt/i,
  },
];

export function resolveTuebingenVenueCoordsFromText(
  text: string,
): { key: keyof typeof TUEBINGEN_VENUE_COORDS; coords: TuebingenVenueCoords } | null {
  const hay = text.trim();
  if (!hay) return null;
  for (const matcher of VENUE_MATCHERS) {
    if (matcher.match.test(hay)) {
      return { key: matcher.key, coords: TUEBINGEN_VENUE_COORDS[matcher.key] };
    }
  }
  return null;
}

/** Soft city fallback — only when the text clearly refers to Tübingen itself. */
export function resolveTuebingenCityFallback(text: string): TuebingenVenueCoords | null {
  if (!/\bt[uü]bingen\b/i.test(text)) return null;
  return TUEBINGEN_VENUE_COORDS.tuebingenCenter;
}
