import type { DiscoverEvent } from "@/services/discover/discover-view-model";
import {
  resolveTuebingenCityFallback,
  resolveTuebingenVenueCoordsFromText,
  type TuebingenVenueCoords,
} from "@/lib/tuebingen-venues";

function partyProbeText(party: DiscoverEvent): string {
  return `${party.locationName ?? ""} ${party.vibeLabel} ${party.title} ${party.sourceBadge ?? ""}`;
}

export function resolvePartyMapCoordinates(party: DiscoverEvent): TuebingenVenueCoords | null {
  if (
    typeof party.publicLat === "number" &&
    typeof party.publicLng === "number" &&
    Number.isFinite(party.publicLat) &&
    Number.isFinite(party.publicLng)
  ) {
    return { lat: party.publicLat, lng: party.publicLng };
  }

  const matched = resolveTuebingenVenueCoordsFromText(partyProbeText(party));
  if (matched) return matched.coords;

  // Last resort for Tübingen-tagged events without a known venue pin.
  return resolveTuebingenCityFallback(partyProbeText(party));
}

export function filterPartiesWithMapCoords(parties: DiscoverEvent[]): DiscoverEvent[] {
  return parties.filter((party) => resolvePartyMapCoordinates(party) !== null);
}

/** Round coords so stacked venue events share one map pin. */
export function mapPinKey(coords: TuebingenVenueCoords): string {
  return `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
}
