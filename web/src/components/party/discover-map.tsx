"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  hasExternalServicesConsent,
  setCookieConsent,
} from "@/lib/cookie-consent";
import type { DiscoverFilterKey } from "@/lib/discover-filters";
import { createBaseMapStyle } from "@/lib/map-style";
import { ensurePerformanceMarkApi } from "@/lib/performance-compat";
import {
  mapPinKey,
  resolvePartyMapCoordinates,
} from "@/lib/discover-map-coords";
import { DiscoverEvent } from "@/services/discover/discover-view-model";

type Props = {
  parties: DiscoverEvent[];
  /** Optional outer map container classes (default uses zinc border for classic discover). */
  containerClassName?: string;
  /** If active, markers switch to accent orange for filter-highlighted mode. */
  accentMarkers?: boolean;
  activeFilter?: DiscoverFilterKey;
  /** Discover v2 dark chrome for consent / empty states. */
  tone?: "classic" | "discover";
};

type MapTheme = "light" | "dark";

type PinGroup = {
  key: string;
  lat: number;
  lng: number;
  events: DiscoverEvent[];
};

const ACCENT_MARKER_ORANGE = "#c4783a";
const KUCKUCK_RED = "#b00000";
const CLUBHAUS_BLUE = "#1d4ed8";
const SCHLACHTHAUS_BROWN = "#7c2d12";
const HOLLE_ROSE = "#be185d";
const SCHAF_CYAN = "#0e7490";
const DEFAULT_MARKER = "#1c1815";
const TUEBINGEN_CENTER: [number, number] = [9.0576, 48.5216];

function resolveMarkerTheme(party: DiscoverEvent, accentMarkers = false) {
  if (accentMarkers) {
    return { background: ACCENT_MARKER_ORANGE, foreground: "#1c1410", glyph: "•", venue: "Gefiltert" };
  }
  const location = `${party.locationName ?? ""} ${party.vibeLabel} ${party.title}`.toLowerCase();

  if (/\bkuckuck\b/.test(location)) {
    return { background: KUCKUCK_RED, foreground: "#ffffff", glyph: "K", venue: "Kuckuck" };
  }
  if (/\bclubhaus\b/.test(location)) {
    return { background: CLUBHAUS_BLUE, foreground: "#ffffff", glyph: "C", venue: "Clubhaus" };
  }
  if (/\bschlachthaus\b/.test(location)) {
    return { background: SCHLACHTHAUS_BROWN, foreground: "#ffffff", glyph: "S", venue: "Schlachthaus" };
  }
  if (/frau\s*holle|\bfrauholle\b/.test(location)) {
    return { background: HOLLE_ROSE, foreground: "#ffffff", glyph: "H", venue: "Frau Holle" };
  }
  if (/schwarzes\s*schaf|schwarzesschaf/.test(location)) {
    return { background: SCHAF_CYAN, foreground: "#ffffff", glyph: "SS", venue: "Schwarzes Schaf" };
  }
  if (/\bepplehaus\b/.test(location)) {
    return { background: "#15803d", foreground: "#ffffff", glyph: "E", venue: "Epplehaus" };
  }
  if (/club\s*voltaire|\bvoltaire\b/.test(location)) {
    return { background: "#7c3aed", foreground: "#ffffff", glyph: "V", venue: "Club Voltaire" };
  }
  if (/\bsudhaus\b/.test(location)) {
    return { background: "#334155", foreground: "#ffffff", glyph: "SH", venue: "Sudhaus" };
  }
  if (/blauer\s*turm/.test(location)) {
    return { background: "#1e40af", foreground: "#ffffff", glyph: "BT", venue: "Blauer Turm" };
  }
  if (/\btop\s*10\b|\btop10\b/.test(location)) {
    return { background: "#c96f2e", foreground: "#ffffff", glyph: "T10", venue: "Top10" };
  }
  if (/\bd\.?a\.?i\.?\b|deutsch[- ]amerikanisches?\s*institut/.test(location)) {
    return { background: "#0f766e", foreground: "#ffffff", glyph: "DAI", venue: "d.a.i." };
  }
  if (/universit[aä]t|\buni[- ]?t[uü]bingen\b/.test(location)) {
    return { background: "#9a3412", foreground: "#ffffff", glyph: "U", venue: "Uni" };
  }
  if (/uhlandstra(ß|ss)e|flohmarkt/.test(location)) {
    return { background: "#5a6b52", foreground: "#ffffff", glyph: "FM", venue: "Flohmarkt" };
  }
  if (/\bmarktplatz\b|\brathaus\b|wochenmarkt/.test(location)) {
    return { background: "#b45309", foreground: "#ffffff", glyph: "M", venue: "Markt" };
  }
  if (party.isExternal) {
    return { background: "#0f172a", foreground: "#ffffff", glyph: "E", venue: "Extern" };
  }
  return { background: DEFAULT_MARKER, foreground: "#ffffff", glyph: "WG", venue: "Community" };
}

function formatStartForPopup(startsAt: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));
}

function createPopupNode(events: DiscoverEvent[], venueLabel: string) {
  const root = document.createElement("div");
  root.className = "discover-map-popup max-w-[16rem] space-y-2";

  const heading = document.createElement("p");
  heading.className = "text-[11px] font-semibold uppercase tracking-wide text-zinc-500";
  heading.textContent =
    events.length > 1 ? `${venueLabel} · ${events.length} Events` : venueLabel;
  root.appendChild(heading);

  const list = document.createElement("div");
  list.className = "space-y-2";

  for (const party of events.slice(0, 8)) {
    const row = document.createElement("a");
    row.href = party.detailHref;
    row.className = "block rounded-md outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-[#c4783a]/50";

    const titleNode = document.createElement("p");
    titleNode.className = "text-sm font-semibold text-zinc-900 leading-snug";
    titleNode.textContent = party.title;
    row.appendChild(titleNode);

    const metaNode = document.createElement("p");
    metaNode.className = "text-xs text-zinc-600";
    const locationLabel = party.locationName?.trim() || venueLabel;
    metaNode.textContent = `${locationLabel} · ${formatStartForPopup(party.startsAt)}`;
    row.appendChild(metaNode);

    list.appendChild(row);
  }

  if (events.length > 8) {
    const more = document.createElement("p");
    more.className = "text-[11px] text-zinc-500";
    more.textContent = `+${events.length - 8} weitere`;
    list.appendChild(more);
  }

  root.appendChild(list);
  return root;
}

function createMarkerElement(
  theme: { glyph: string; background: string; foreground: string },
  count: number,
) {
  const marker = document.createElement("div");
  marker.className =
    "grid h-10 w-10 place-items-center overflow-hidden rounded-full border text-[10px] font-bold shadow-[0_10px_24px_-14px_rgba(2,6,23,0.7)]";
  marker.style.backgroundColor = theme.background;
  marker.style.color = theme.foreground;
  marker.style.borderColor = "rgba(255,255,255,0.78)";
  marker.textContent = count > 1 ? String(Math.min(count, 99)) : theme.glyph;
  return marker;
}

function groupPartiesByPin(parties: DiscoverEvent[]): PinGroup[] {
  const groups = new Map<string, PinGroup>();
  for (const party of parties) {
    const coords = resolvePartyMapCoordinates(party);
    if (!coords) continue;
    const key = mapPinKey(coords);
    const existing = groups.get(key);
    if (existing) {
      existing.events.push(party);
    } else {
      groups.set(key, { key, lat: coords.lat, lng: coords.lng, events: [party] });
    }
  }
  for (const group of groups.values()) {
    group.events.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  return Array.from(groups.values());
}

const DEFAULT_MAP_CONTAINER_CLASS =
  "h-[22rem] w-full overflow-hidden rounded-2xl border border-zinc-200";

export function DiscoverMap({
  parties,
  containerClassName,
  accentMarkers = false,
  tone = "classic",
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<import("maplibre-gl").Map | null>(null);
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markersRef = useRef<Array<import("maplibre-gl").Marker>>([]);
  const lastMarkerSignatureRef = useRef<string>("");
  const [mapReady, setMapReady] = useState(false);
  const [canLoadMap, setCanLoadMap] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return hasExternalServicesConsent();
  });
  const [mapTheme, setMapTheme] = useState<MapTheme>(() => {
    if (typeof document === "undefined") return "light";
    const root = document.documentElement;
    return root.classList.contains("dark") ? "dark" : "light";
  });

  const pinGroups = useMemo(() => groupPartiesByPin(parties), [parties]);

  useEffect(() => {
    const syncConsent = () => setCanLoadMap(hasExternalServicesConsent());
    syncConsent();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, syncConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, syncConsent);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const syncTheme = () => {
      setMapTheme(root.classList.contains("dark") ? "dark" : "light");
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Create map once (do not remount on theme — that wiped markers / caused blank maps).
  useEffect(() => {
    if (!canLoadMap || !mapRef.current || mapInstanceRef.current) {
      return;
    }

    let mounted = true;
    let resizeObserver: ResizeObserver | null = null;

    void (async () => {
      ensurePerformanceMarkApi();
      const maplibreModule = await import("maplibre-gl");
      const maplibre = ("default" in maplibreModule ? maplibreModule.default : maplibreModule) as typeof import("maplibre-gl");
      maplibreRef.current = maplibre;

      if (!mounted || !mapRef.current) {
        return;
      }

      const map = new maplibre.Map({
        container: mapRef.current,
        style: createBaseMapStyle(mapTheme),
        center: TUEBINGEN_CENTER,
        zoom: 12.2,
      });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      mapInstanceRef.current = map;

      const bumpSize = () => {
        try {
          map.resize();
        } catch {
          /* ignore */
        }
      };

      map.once("load", () => {
        if (!mounted) return;
        bumpSize();
        setMapReady(true);
      });

      // Container often lays out after mount (view switch) — force resize.
      requestAnimationFrame(bumpSize);
      window.setTimeout(bumpSize, 120);
      window.setTimeout(bumpSize, 400);

      if (typeof ResizeObserver !== "undefined" && mapRef.current) {
        resizeObserver = new ResizeObserver(() => bumpSize());
        resizeObserver.observe(mapRef.current);
      }
    })();

    return () => {
      mounted = false;
      resizeObserver?.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      maplibreRef.current = null;
      lastMarkerSignatureRef.current = "";
      setMapReady(false);
    };
    // Intentionally only when consent flips — theme updates via setStyle below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoadMap]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    map.setStyle(createBaseMapStyle(mapTheme));
  }, [mapTheme, mapReady]);

  useEffect(() => {
    if (!canLoadMap || !mapReady || !mapInstanceRef.current || !maplibreRef.current) {
      return;
    }

    const map = mapInstanceRef.current;
    const maplibre = maplibreRef.current;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!pinGroups.length) {
      lastMarkerSignatureRef.current = "";
      map.easeTo({ center: TUEBINGEN_CENTER, zoom: 12.2, duration: 400 });
      return;
    }

    const bounds = new maplibre.LngLatBounds();

    for (const group of pinGroups) {
      const lead = group.events[0];
      const theme = resolveMarkerTheme(lead, accentMarkers);
      const popupNode = createPopupNode(group.events, theme.venue);

      const marker = new maplibre.Marker({
        element: createMarkerElement(theme, group.events.length),
      })
        .setLngLat([group.lng, group.lat])
        .setPopup(new maplibre.Popup({ offset: 18, maxWidth: "280px" }).setDOMContent(popupNode))
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([group.lng, group.lat]);
    }

    const markerSignature = pinGroups
      .map((g) => `${g.key}:${g.events.map((e) => e.id).sort().join(",")}`)
      .sort()
      .join("|");

    if (markerSignature !== lastMarkerSignatureRef.current) {
      map.resize();
      if (pinGroups.length === 1) {
        map.easeTo({
          center: [pinGroups[0].lng, pinGroups[0].lat],
          zoom: 14,
          duration: 650,
        });
      } else {
        map.fitBounds(bounds, {
          padding: 56,
          maxZoom: 14.5,
          duration: 650,
        });
      }
      lastMarkerSignatureRef.current = markerSignature;
    }
  }, [accentMarkers, canLoadMap, mapReady, pinGroups]);

  if (!canLoadMap) {
    if (tone === "discover") {
      return (
        <div className="grid min-h-[18rem] w-full place-items-center rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-card)] p-6 text-center">
          <div>
            <p className="text-sm font-semibold text-[color:var(--foreground)]">Karte braucht Einwilligung</p>
            <p className="mt-2 text-xs leading-relaxed text-[color:var(--muted-foreground)]">
              Für Kartenkacheln (OpenStreetMap / CARTO) externe Dienste einmalig freigeben.
            </p>
            <button
              type="button"
              onClick={() => {
                setCookieConsent("accepted");
                setCanLoadMap(true);
              }}
              className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-[color:var(--accent)] px-4 text-sm font-semibold text-[color:var(--primary-foreground)]"
            >
              Externe Dienste aktivieren
            </button>
          </div>
        </div>
      );
    }

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

  return <div ref={mapRef} className={containerClassName ?? DEFAULT_MAP_CONTAINER_CLASS} />;
}

/** Lightweight list companion for map view (Discover v2). */
export function DiscoverMapEventList({
  parties,
  formatEventDate,
  formatEventTime,
  venueLabel,
}: {
  parties: DiscoverEvent[];
  formatEventDate: (iso: string) => string;
  formatEventTime: (iso: string) => string;
  venueLabel: (event: DiscoverEvent) => string;
}) {
  if (!parties.length) return null;
  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
        Auf der Karte · {parties.length}
      </p>
      <ul className="space-y-2">
        {parties.slice(0, 40).map((event) => (
          <li key={event.id}>
            <Link
              href={event.detailHref}
              className="flex items-start justify-between gap-3 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-card)] px-3 py-2.5 transition-colors hover:border-[color:var(--border-strong)]"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[color:var(--foreground)]">{event.title}</span>
                <span className="mt-0.5 block truncate text-xs text-[color:var(--muted-foreground)]">
                  {venueLabel(event)} · {formatEventDate(event.startsAt)} {formatEventTime(event.startsAt)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {parties.length > 40 ? (
        <p className="px-1 text-xs text-[color:var(--muted-foreground)]">+{parties.length - 40} weitere in der Listen-/Kartenfilterung</p>
      ) : null}
    </div>
  );
}
