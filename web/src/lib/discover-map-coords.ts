import type { DiscoverEvent } from "@/services/discover/discover-view-model";

const VENUE_COORDS = {
  kuckuck: { lat: 48.5413588, lng: 9.0599431 },
  clubhaus: { lat: 48.5243852, lng: 9.0605991 },
  schlachthaus: { lat: 48.5255, lng: 9.0515 },
  frauHolle: { lat: 48.5203906, lng: 9.051808 },
  schwarzesSchaf: { lat: 48.5212656, lng: 9.0574061 },
  epplehaus: { lat: 48.522317, lng: 9.048936 },
  blauerTurm: { lat: 48.5178, lng: 9.0601 },
  top10: { lat: 48.5145, lng: 9.0835 },
  sudhaus: { lat: 48.5065, lng: 9.0625 },
  uhlandstrasse: { lat: 48.52162, lng: 9.05496 },
  marktplatz: { lat: 48.52156, lng: 9.05774 },
} as const;

function getVenueKey(
  party: DiscoverEvent,
):
  | "kuckuck"
  | "clubhaus"
  | "schlachthaus"
  | "frau-holle"
  | "schwarzes-schaf"
  | "epplehaus"
  | "blauer-turm"
  | "top10"
  | "sudhaus"
  | "uhlandstrasse"
  | "marktplatz"
  | null {
  const location = `${party.locationName ?? ""} ${party.vibeLabel} ${party.title}`.toLowerCase();

  if (location.includes("kuckuck")) return "kuckuck";
  if (location.includes("clubhaus")) return "clubhaus";
  if (location.includes("schlachthaus")) return "schlachthaus";
  if (location.includes("frau holle") || location.includes("frau_holle") || location.includes("holle") || location.includes("haaggasse")) {
    return "frau-holle";
  }
  if (location.includes("schwarzes schaf") || location.includes("schwarzesschaf") || location.includes("schaf")) {
    return "schwarzes-schaf";
  }
  if (location.includes("epplehaus")) return "epplehaus";
  if (location.includes("blauer turm")) return "blauer-turm";
  if (location.includes("top10")) return "top10";
  if (location.includes("sudhaus")) return "sudhaus";
  if (location.includes("uhlandstraße") || location.includes("uhlandstrasse") || location.includes("flohmarkt")) {
    return "uhlandstrasse";
  }
  if (location.includes("marktplatz") || location.includes("rathaus") || location.includes("markt")) {
    return "marktplatz";
  }

  return null;
}

export function resolvePartyMapCoordinates(party: DiscoverEvent): { lat: number; lng: number } | null {
  if (Number.isFinite(party.publicLat) && Number.isFinite(party.publicLng)) {
    return { lat: Number(party.publicLat), lng: Number(party.publicLng) };
  }

  const venueKey = getVenueKey(party);
  if (venueKey === "kuckuck") return VENUE_COORDS.kuckuck;
  if (venueKey === "clubhaus") return VENUE_COORDS.clubhaus;
  if (venueKey === "schlachthaus") return VENUE_COORDS.schlachthaus;
  if (venueKey === "frau-holle") return VENUE_COORDS.frauHolle;
  if (venueKey === "schwarzes-schaf") return VENUE_COORDS.schwarzesSchaf;
  if (venueKey === "epplehaus") return VENUE_COORDS.epplehaus;
  if (venueKey === "blauer-turm") return VENUE_COORDS.blauerTurm;
  if (venueKey === "top10") return VENUE_COORDS.top10;
  if (venueKey === "sudhaus") return VENUE_COORDS.sudhaus;
  if (venueKey === "uhlandstrasse") return VENUE_COORDS.uhlandstrasse;
  if (venueKey === "marktplatz") return VENUE_COORDS.marktplatz;

  return null;
}

export function filterPartiesWithMapCoords(parties: DiscoverEvent[]): DiscoverEvent[] {
  return parties.filter((party) => resolvePartyMapCoordinates(party) !== null);
}
