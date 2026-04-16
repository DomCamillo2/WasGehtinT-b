"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { PartyCard } from "@/lib/types";
import { hasExternalServicesConsent, setCookieConsent } from "@/lib/cookie-consent";
import { createBaseMapStyle } from "@/lib/map-style";
import { ensurePerformanceMarkApi } from "@/lib/performance-compat";

type Props = {
  parties: PartyCard[];
};

const KUCKUCK_RED = "#b00000";
const CLUBHAUS_BLUE = "#1d4ed8";
const SCHLACHTHAUS_BROWN = "#7c2d12";
const HOLLE_ROSE = "#be185d";
const SCHAF_CYAN = "#0e7490";
const DEFAULT_MARKER = "#18181b";

const VENUE_ICON_MATCHERS: Array<{ match: RegExp; src: string; alt: string }> = [
  { match: /kuckuck/i, src: "/logos/venues/kuckuck.png", alt: "Kuckuck Logo" },
  { match: /schlachthaus/i, src: "/logos/venues/schlachthaus.jpg", alt: "Schlachthaus Logo" },
  { match: /clubhaus/i, src: "/logos/venues/clubhaus.jpg", alt: "Clubhaus Logo" },
  { match: /epplehaus/i, src: "/logos/venues/epplehaus.jpg", alt: "Epplehaus Logo" },
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

function hasCoordinates(party: PartyCard) {
  return Number.isFinite(party.public_lat) && Number.isFinite(party.public_lng);
}

function resolveMarkerTheme(party: PartyCard) {
  const location = `${party.location_name ?? ""} ${party.vibe_label} ${party.title}`.toLowerCase();

  for (const matcher of VENUE_ICON_MATCHERS) {
    if (matcher.match.test(location)) {
      if (matcher.src.includes("kuckuck")) {
        return { background: KUCKUCK_RED, foreground: "#ffffff", glyph: "K", venue: "Kuckuck", iconSrc: matcher.src, iconAlt: matcher.alt };
      }

      if (matcher.src.includes("schlachthaus")) {
        return { background: SCHLACHTHAUS_BROWN, foreground: "#ffffff", glyph: "S", venue: "Schlachthaus", iconSrc: matcher.src, iconAlt: matcher.alt };
      }

      if (matcher.src.includes("clubhaus")) {
        return { background: CLUBHAUS_BLUE, foreground: "#ffffff", glyph: "C", venue: "Clubhaus", iconSrc: matcher.src, iconAlt: matcher.alt };
      }

      if (matcher.src.includes("epplehaus")) {
        return { background: "#15803d", foreground: "#ffffff", glyph: "E", venue: "Epplehaus", iconSrc: matcher.src, iconAlt: matcher.alt };
      }

      if (matcher.src.includes("frau-holle")) {
        return { background: HOLLE_ROSE, foreground: "#ffffff", glyph: "H", venue: "Frau Holle", iconSrc: matcher.src, iconAlt: matcher.alt };
      }

      if (matcher.src.includes("schwarzes-schaf")) {
        return { background: SCHAF_CYAN, foreground: "#ffffff", glyph: "SS", venue: "Schwarzes Schaf", iconSrc: matcher.src, iconAlt: matcher.alt };
      }
    }
  }

  if (location.includes("kuckuck")) {
    return { background: KUCKUCK_RED, foreground: "#ffffff", glyph: "K", venue: "Kuckuck" };
  }

  if (location.includes("clubhaus")) {
    return { background: CLUBHAUS_BLUE, foreground: "#ffffff", glyph: "C", venue: "Clubhaus" };
  }

  if (location.includes("schlachthaus")) {
    return { background: SCHLACHTHAUS_BROWN, foreground: "#ffffff", glyph: "S", venue: "Schlachthaus" };
  }

  if (location.includes("frau holle") || location.includes("frau_holle") || location.includes("holle")) {
    return { background: HOLLE_ROSE, foreground: "#ffffff", glyph: "H", venue: "Frau Holle" };
  }

  if (location.includes("schwarzes schaf") || location.includes("schwarzesschaf") || location.includes("schaf")) {
    return { background: SCHAF_CYAN, foreground: "#ffffff", glyph: "SS", venue: "Schwarzes Schaf" };
  }

  if (party.is_external) {
    return { background: "#0f172a", foreground: "#ffffff", glyph: "E", venue: "Extern" };
  }

  return { background: DEFAULT_MARKER, foreground: "#ffffff", glyph: "WG", venue: "Community" };
}

function formatStartForPopup(startsAt: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));
}

function createPopupNode(party: PartyCard, venueLabel: string) {
  const root = document.createElement("div");
  root.className = "space-y-1";

  const titleNode = document.createElement("p");
  titleNode.className = "text-sm font-semibold";
  titleNode.textContent = party.title;
  root.appendChild(titleNode);

  const metaNode = document.createElement("p");
  metaNode.className = "text-xs text-zinc-600";
  const locationLabel = party.location_name?.trim() || venueLabel;
  metaNode.textContent = `${locationLabel} · ${formatStartForPopup(party.starts_at)} Uhr`;
  root.appendChild(metaNode);

  return root;
}

function createMarkerElement(theme: { glyph: string; background: string; foreground: string; iconSrc?: string; iconAlt?: string }) {
  const marker = document.createElement("div");
  marker.className =
    "grid h-10 w-10 place-items-center overflow-hidden rounded-full border text-[10px] font-bold shadow-[0_10px_24px_-14px_rgba(2,6,23,0.7)]";
  marker.style.backgroundColor = theme.background;
  marker.style.color = theme.foreground;
  marker.style.borderColor = "rgba(255,255,255,0.78)";

  if (theme.iconSrc) {
    const image = document.createElement("img");
    image.src = theme.iconSrc;
    image.alt = theme.iconAlt ?? theme.glyph;
    image.className = "h-full w-full object-cover";
    marker.appendChild(image);
    return marker;
  }

  marker.textContent = theme.glyph;
  return marker;
}

export function DiscoverMap({ parties }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<import("maplibre-gl").Map | null>(null);
  const maplibreRef = useRef<any>(null);
  const markersRef = useRef<Array<import("maplibre-gl").Marker>>([]);
  const lastMarkerSignatureRef = useRef<string>("");
  const [mapReady, setMapReady] = useState(false);
  const [canLoadMap, setCanLoadMap] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return hasExternalServicesConsent();
  });
  const partiesWithCoords = useMemo(() => parties.filter(hasCoordinates), [parties]);

  useEffect(() => {
    if (!canLoadMap || !mapRef.current || mapInstanceRef.current) {
      return;
    }

    let mounted = true;

    void (async () => {
      ensurePerformanceMarkApi();
      const maplibre = (await import("maplibre-gl")).default;
      maplibreRef.current = maplibre;

      if (!mounted || !mapRef.current) {
        return;
      }

      const map = new maplibre.Map({
        container: mapRef.current,
        style: createBaseMapStyle(),
        center: [9.0599431, 48.5413588],
        zoom: 12,
      });
      mapInstanceRef.current = map;
      map.once("load", () => {
        if (mounted) {
          setMapReady(true);
        }
      });
    })();

    return () => {
      mounted = false;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      maplibreRef.current = null;
      lastMarkerSignatureRef.current = "";
      setMapReady(false);
    };
  }, [canLoadMap]);

  useEffect(() => {
    if (!canLoadMap || !mapReady || !mapInstanceRef.current || !maplibreRef.current) {
      return;
    }

    const map = mapInstanceRef.current;
    const maplibre = maplibreRef.current;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!partiesWithCoords.length) {
      lastMarkerSignatureRef.current = "";
      return;
    }

    const bounds = new maplibre.LngLatBounds();

    for (const party of partiesWithCoords) {
      const lng = Number(party.public_lng);
      const lat = Number(party.public_lat);
      const theme = resolveMarkerTheme(party);
      const popupNode = createPopupNode(party, theme.venue);

      const marker = new maplibre.Marker({
        element: createMarkerElement(theme),
      })
        .setLngLat([lng, lat])
        .setPopup(new maplibre.Popup({ offset: 16 }).setDOMContent(popupNode))
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
    }

    const markerSignature = partiesWithCoords
      .map((party) => `${party.id}:${party.public_lat}:${party.public_lng}`)
      .sort()
      .join("|");

    if (markerSignature !== lastMarkerSignatureRef.current) {
      if (partiesWithCoords.length === 1) {
        const singleParty = partiesWithCoords[0];
        map.easeTo({
          center: [Number(singleParty.public_lng), Number(singleParty.public_lat)],
          zoom: 13.5,
          duration: 650,
        });
      } else {
        map.fitBounds(bounds, {
          padding: 44,
          maxZoom: 14,
          duration: 650,
        });
      }

      lastMarkerSignatureRef.current = markerSignature;
    }
  }, [canLoadMap, mapReady, partiesWithCoords]);

  if (!canLoadMap) {
    return (
      <div className="grid h-56 w-full place-items-center rounded-2xl border border-zinc-200 bg-zinc-100 p-4 text-center">
        <div>
          <p className="text-sm font-medium text-zinc-700">Karte deaktiviert (Einwilligung fehlt)</p>
          <p className="mt-1 text-xs text-zinc-500">Für Kartenansicht bitte externe Dienste aktivieren.</p>
          <button
            type="button"
            onClick={() => {
              setCookieConsent("accepted");
              setCanLoadMap(true);
            }}
            className="mt-3 inline-flex h-9 items-center rounded-xl bg-zinc-900 px-3 text-xs font-semibold text-white"
          >
            Externe Dienste aktivieren
          </button>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="h-[22rem] w-full overflow-hidden rounded-2xl border border-zinc-200" />;
}
