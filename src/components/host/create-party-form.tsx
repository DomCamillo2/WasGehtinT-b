"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createPartyAction } from "@/app/actions/parties";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Card } from "@/components/ui/card";
import { createBaseMapStyle } from "@/lib/map-style";

type Props = {
  vibes: Array<{ id: number; label: string }>;
};

const DEFAULT_CENTER = { lat: 48.5216, lng: 9.0522 };

function getVibeEmoji(label: string) {
  const text = label.toLowerCase();

  if (text.includes("chill")) return "🍺";
  if (text.includes("beer") || text.includes("pong")) return "🏓";
  if (text.includes("eskal") || text.includes("techno") || text.includes("club")) return "🔊";
  if (text.includes("house") || text.includes("party")) return "🎉";
  if (text.includes("karaoke")) return "🎤";

  return "✨";
}

export function CreatePartyForm({ vibes }: Props) {
  const [selectedVibeId, setSelectedVibeId] = useState<string>(() => String(vibes[0]?.id ?? ""));
  const [bringItems, setBringItems] = useState<string[]>([""]);
  const [locationState, setLocationState] = useState<string>("Noch kein Standort gesetzt.");
  const [lat, setLat] = useState<number>(DEFAULT_CENTER.lat);
  const [lng, setLng] = useState<number>(DEFAULT_CENTER.lng);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const formattedLat = useMemo(() => lat.toFixed(6), [lat]);
  const formattedLng = useMemo(() => lng.toFixed(6), [lng]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: createBaseMapStyle(),
      center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      zoom: 12,
    });

    const markerElement = document.createElement("div");
    markerElement.className = "h-4 w-4 rounded-full border-2 border-white bg-violet-600 shadow";

    const marker = new maplibregl.Marker({
      element: markerElement,
      draggable: true,
    })
      .setLngLat([DEFAULT_CENTER.lng, DEFAULT_CENTER.lat])
      .addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLngLat();
      setLat(pos.lat);
      setLng(pos.lng);
      setLocationState("Pin verschoben – Standort wird gespeichert.");
    });

    map.on("click", (event) => {
      marker.setLngLat(event.lngLat);
      setLat(event.lngLat.lat);
      setLng(event.lngLat.lng);
      setLocationState("Standort auf der Karte aktualisiert.");
    });

    mapRef.current = map;
    markerRef.current = marker;

    map.on("load", () => {
      map.resize();
    });

    return () => {
      marker.remove();
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat]);
    mapRef.current?.flyTo({ center: [lng, lat], duration: 500 });
  }, [lat, lng]);

  const handleAutoLocation = () => {
    if (!navigator.geolocation) {
      setLocationState("Geolocation wird von diesem Browser nicht unterstützt.");
      return;
    }

    setLocationState("Standort wird ermittelt...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLat = position.coords.latitude;
        const nextLng = position.coords.longitude;
        setLat(nextLat);
        setLng(nextLng);

        markerRef.current?.setLngLat([nextLng, nextLat]);
        mapRef.current?.flyTo({ center: [nextLng, nextLat], zoom: 13 });

        setLocationState("Standort automatisch gefunden.");
      },
      () => {
        setLocationState("Standort konnte nicht ermittelt werden. Bitte Zugriff erlauben oder Pin manuell setzen.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const updateBringItem = (index: number, value: string) => {
    setBringItems((prev) => prev.map((entry, entryIndex) => (entryIndex === index ? value : entry)));
  };

  const addBringItem = () => {
    setBringItems((prev) => [...prev, ""]);
  };

  return (
    <Card className="space-y-4 rounded-2xl border-zinc-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <h2 className="text-base font-semibold text-zinc-900">Neue Party erstellen</h2>
      <p className="text-xs text-zinc-500">Mobile-optimiert: große Touch-Flächen, schneller Vibe- und Standort-Picker.</p>

      <form action={createPartyAction} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="party-title" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Titel der Party
          </label>
          <input
            id="party-title"
            name="title"
            placeholder="z. B. WG Warm-up Donnerstag"
            required
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
          />
          <p className="text-xs text-zinc-500">Kurz und erkennbar – dieser Name steht in Discover und auf der Karte.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="party-description" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Beschreibung (optional)
          </label>
          <textarea
            id="party-description"
            name="description"
            placeholder="z. B. Musikrichtung, Dresscode, was schon da ist"
            className="min-h-24 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
          />
          <p className="text-xs text-zinc-500">Hilft Gästen einzuschätzen, ob die Stimmung zu ihrer Gruppe passt.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="party-start" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Startzeit
            </label>
            <input
              id="party-start"
              name="startsAt"
              type="datetime-local"
              required
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
            <p className="text-xs text-zinc-500">Wann es losgeht.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="party-end" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Endzeit
            </label>
            <input
              id="party-end"
              name="endsAt"
              type="datetime-local"
              required
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
            <p className="text-xs text-zinc-500">Bis wann Gäste ungefähr bleiben können.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Vibe auswählen</label>
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {vibes.map((vibe) => {
              const active = selectedVibeId === String(vibe.id);
              return (
                <button
                  key={vibe.id}
                  type="button"
                  onClick={() => setSelectedVibeId(String(vibe.id))}
                  aria-pressed={active}
                  className={`shrink-0 rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "border-violet-300 bg-violet-50 text-violet-700"
                      : "border-zinc-200 bg-white text-zinc-700 active:scale-[0.99]"
                  }`}
                >
                  <span className="mr-1.5">{getVibeEmoji(vibe.label)}</span>
                  <span>{vibe.label}</span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="vibeId" value={selectedVibeId} />
          <p className="text-xs text-zinc-500">Horizontal swipen und den passenden Party-Style antippen.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="party-max-guests" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Max. Gäste
            </label>
            <input
              id="party-max-guests"
              name="maxGuests"
              type="number"
              min={1}
              max={200}
              defaultValue={20}
              required
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              placeholder="z. B. 20"
            />
            <p className="text-xs text-zinc-500">Wie viele Gäste du insgesamt aufnehmen willst.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="party-contribution" className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Beitrag pro Person (€)
            </label>
            <input
              id="party-contribution"
              name="contributionEur"
              type="number"
              step="0.5"
              min={0}
              defaultValue={5}
              required
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              placeholder="z. B. 5"
            />
            <p className="text-xs text-zinc-500">Wird beim Bezahlprozess pro Gast berechnet.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">Standort (grob für Discover)</label>
          <button
            type="button"
            onClick={handleAutoLocation}
            className="inline-flex h-11 items-center rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition active:scale-[0.99]"
          >
            Standort automatisch finden
          </button>
          <p className="text-xs text-zinc-500">{locationState}</p>
          <div ref={mapContainerRef} className="h-44 w-full overflow-hidden rounded-2xl border border-zinc-200" />
          <p className="text-xs text-zinc-500">
            Pin antippen/ziehen, um die Position grob anzupassen. Aktuell: {formattedLat}, {formattedLng}
          </p>

          <input type="hidden" name="publicLat" value={formattedLat} />
          <input type="hidden" name="publicLng" value={formattedLng} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Mitbring-Liste (optional)</p>
          <p className="text-xs text-zinc-500">Item ergänzen per Plus-Button, z. B. Snacks, Mixer, Becher.</p>

          <div className="grid grid-cols-1 gap-2">
            {bringItems.map((item, index) => (
              <input
                key={`bring-item-${index}`}
                name="bringItem"
                value={item}
                onChange={(event) => updateBringItem(index, event.target.value)}
                placeholder={`Item ${index + 1}`}
                className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addBringItem}
            className="inline-flex h-10 items-center rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition active:scale-[0.99]"
          >
            ＋ Item hinzufügen
          </button>
        </div>

        <PrimaryButton
          type="submit"
          className="h-12 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-base font-semibold text-white shadow-[0_12px_28px_rgba(79,70,229,0.35)] transition hover:from-violet-500 hover:to-blue-500 active:scale-[0.985]"
        >
          Party veröffentlichen
        </PrimaryButton>
      </form>
    </Card>
  );
}
