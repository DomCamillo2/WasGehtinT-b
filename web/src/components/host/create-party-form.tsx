"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useFormStatus } from "react-dom";
import { createPartyAction, type CreatePartyActionState } from "@/app/actions/parties";
import { PrimaryButton } from "@/components/ui/primary-button";
import { useToast } from "@/components/ui/toast-provider";
import { hasExternalServicesConsent, setCookieConsent } from "@/lib/cookie-consent";
import { createBaseMapStyle } from "@/lib/map-style";
import { ensurePerformanceMarkApi } from "@/lib/performance-compat";
import {
  reverseGeocodeCoordinates as reverseGeocodeCoordinatesService,
  searchAddress as searchAddressService,
} from "@/services/location/nominatim-service";

type Props = {
  vibes: Array<{ id: number; label: string }>;
  isAuthenticated?: boolean;
};

const INITIAL_CREATE_PARTY_STATE: CreatePartyActionState = {
  ok: false,
  message: "",
};

const DEFAULT_CENTER = { lat: 48.5216, lng: 9.0522 };
const FALLBACK_VIBES: Array<{ id: number; label: string }> = [
  { id: 1, label: "Hausparty" },
  { id: 2, label: "Chill" },
  { id: 3, label: "Techno" },
  { id: 4, label: "Karaoke" },
];

function getVibeEmoji(label: string) {
  const text = label.toLowerCase();
  if (text.includes("chill")) return "🍺";
  if (text.includes("beer") || text.includes("pong")) return "🏓";
  if (text.includes("eskal") || text.includes("techno") || text.includes("club")) return "🔊";
  if (text.includes("house") || text.includes("party")) return "🎉";
  if (text.includes("karaoke")) return "🎤";
  return "✨";
}

const fieldCls =
  "field-surface h-12 w-full rounded-2xl px-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]";
const labelCls = "text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]";
const hintCls = "text-xs text-[var(--muted-foreground)]";
const ghostBtnCls =
  "inline-flex items-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-4 text-sm font-medium text-[var(--foreground)] transition active:scale-[0.99] disabled:opacity-60";

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">{label}</span>
      <div className="flex-1 border-t border-[var(--border-soft)]" />
    </div>
  );
}

function SubmitPartyButton() {
  const { pending } = useFormStatus();
  return (
    <PrimaryButton
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-base font-semibold text-white shadow-[0_12px_28px_rgba(79,70,229,0.35)] transition hover:from-violet-500 hover:to-blue-500 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Wird eingereicht..." : "Event zur Freigabe einreichen"}
    </PrimaryButton>
  );
}

export function CreatePartyForm({ vibes, isAuthenticated = true }: Props) {
  const { showToast } = useToast();
  const safeVibes = useMemo(() => {
    const normalized = vibes
      .filter((v) => typeof v.id === "number" && Number.isFinite(v.id))
      .map((v) => ({ id: v.id, label: v.label?.trim() || `Vibe #${v.id}` }));
    return normalized.length > 0 ? normalized : FALLBACK_VIBES;
  }, [vibes]);

  const [selectedVibeId, setSelectedVibeId] = useState<string>(() => String(safeVibes[0]?.id ?? ""));
  const [customVibeLabel, setCustomVibeLabel] = useState<string>("");
  const [bringItems, setBringItems] = useState<string[]>([""]);
  const [locationState, setLocationState] = useState<string>("Noch kein Standort gesetzt.");
  const [addressInput, setAddressInput] = useState<string>("");
  const [resolvedAddress, setResolvedAddress] = useState<string>("");
  const [isAddressSearching, setIsAddressSearching] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [canLoadExternalServices, setCanLoadExternalServices] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return hasExternalServicesConsent();
  });
  const [lat, setLat] = useState<number>(DEFAULT_CENTER.lat);
  const [lng, setLng] = useState<number>(DEFAULT_CENTER.lng);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const [actionState, formAction] = useActionState(createPartyAction, INITIAL_CREATE_PARTY_STATE);

  const formattedLat = useMemo(() => lat.toFixed(6), [lat]);
  const formattedLng = useMemo(() => lng.toFixed(6), [lng]);

  const reverseGeocodeCoordinates = useCallback(
    async (nextLat: number, nextLng: number) => {
      if (!canLoadExternalServices) return;
      setIsReverseGeocoding(true);
      setLocationState("Adresse wird aus Pin-Position ermittelt...");
      try {
        const result = await reverseGeocodeCoordinatesService(nextLat, nextLng);
        if (result.status === "unavailable") {
          setLocationState("Pin gesetzt. Adresse konnte nicht automatisch aufgelöst werden.");
          showToast({ variant: "error", title: "Adresse nicht erreichbar", message: "Der Geocoding-Dienst antwortet gerade nicht." });
          return;
        }
        if (result.status === "not_found") {
          setLocationState("Pin gesetzt. Keine genaue Adresse gefunden.");
          return;
        }
        if (result.status !== "ok") return;
        setAddressInput(result.displayName);
        setResolvedAddress(result.displayName);
        setLocationState("Pin gesetzt und Adresse übernommen.");
      } catch {
        setLocationState("Pin gesetzt. Adresse konnte nicht automatisch geladen werden.");
        showToast({ variant: "error", title: "Adressauflösung fehlgeschlagen" });
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [canLoadExternalServices, showToast],
  );

  useEffect(() => {
    if (!safeVibes.length) return;
    const exists = selectedVibeId === "__custom__" || safeVibes.some((v) => String(v.id) === selectedVibeId);
    if (!exists) setSelectedVibeId(String(safeVibes[0].id));
  }, [safeVibes, selectedVibeId]);

  useEffect(() => {
    if (!canLoadExternalServices || !mapContainerRef.current || mapRef.current) return;
    let mounted = true;
    void (async () => {
      ensurePerformanceMarkApi();
      const maplibre = (await import("maplibre-gl")).default;
      if (!mounted || !mapContainerRef.current || mapRef.current) return;
      const map = new maplibre.Map({
        container: mapContainerRef.current,
        style: createBaseMapStyle(),
        center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
        zoom: 12,
      });
      const markerElement = document.createElement("div");
      markerElement.style.width = "24px";
      markerElement.style.height = "24px";
      markerElement.style.borderRadius = "9999px";
      markerElement.style.background = "radial-gradient(circle at 30% 30%, #a78bfa 0%, #7c3aed 45%, #5b21b6 100%)";
      markerElement.style.border = "2px solid #ffffff";
      markerElement.style.boxShadow = "0 10px 22px rgba(124,58,237,0.45), 0 0 0 8px rgba(124,58,237,0.16)";
      markerElement.style.transform = "translateZ(0)";
      const marker = new maplibre.Marker({ element: markerElement, draggable: true })
        .setLngLat([DEFAULT_CENTER.lng, DEFAULT_CENTER.lat])
        .addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        setLat(pos.lat);
        setLng(pos.lng);
        void reverseGeocodeCoordinates(pos.lat, pos.lng);
      });
      map.on("click", (event) => {
        marker.setLngLat(event.lngLat);
        setLat(event.lngLat.lat);
        setLng(event.lngLat.lng);
        void reverseGeocodeCoordinates(event.lngLat.lat, event.lngLat.lng);
      });
      mapRef.current = map;
      markerRef.current = marker;
      map.on("load", () => { map.resize(); });
    })();
    return () => {
      mounted = false;
      markerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [canLoadExternalServices, reverseGeocodeCoordinates]);

  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat]);
    mapRef.current?.flyTo({ center: [lng, lat], duration: 500 });
  }, [lat, lng]);

  useEffect(() => {
    if (!actionState.ok) return;
    showToast({ variant: "success", title: "Event eingereicht", message: actionState.message || "Dein Event wurde zur Freigabe gespeichert." });
    formRef.current?.reset();
    setSelectedVibeId(String(safeVibes[0]?.id ?? ""));
    setCustomVibeLabel("");
    setBringItems([""]);
    setAddressInput("");
    setResolvedAddress("");
    setLat(DEFAULT_CENTER.lat);
    setLng(DEFAULT_CENTER.lng);
    setLocationState("Event gespeichert.");
  }, [actionState.message, actionState.ok, safeVibes, showToast]);

  useEffect(() => {
    if (actionState.ok || !actionState.message) return;
    showToast({ variant: "error", title: "Einreichen fehlgeschlagen", message: actionState.message });
  }, [actionState.message, actionState.ok, showToast]);

  const handleAutoLocation = () => {
    if (!navigator.geolocation) {
      setLocationState("Geolocation wird von diesem Browser nicht unterstützt.");
      showToast({ variant: "error", title: "Geolocation nicht unterstützt" });
      return;
    }
    setLocationState("Standort wird ermittelt...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLat = position.coords.latitude;
        const nextLng = position.coords.longitude;
        setLat(nextLat);
        setLng(nextLng);
        setResolvedAddress("");
        markerRef.current?.setLngLat([nextLng, nextLat]);
        mapRef.current?.flyTo({ center: [nextLng, nextLat], zoom: 13 });
        setLocationState("Standort automatisch gefunden.");
      },
      () => {
        setLocationState("Standort konnte nicht ermittelt werden. Bitte Zugriff erlauben oder Pin manuell setzen.");
        showToast({ variant: "error", title: "Standort konnte nicht ermittelt werden", message: "Bitte Standortzugriff erlauben oder den Pin manuell setzen." });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleAddressSearch = async () => {
    if (!canLoadExternalServices) {
      setLocationState("Für Adresssuche bitte externe Dienste aktivieren.");
      showToast({ variant: "info", title: "Externe Dienste deaktiviert" });
      return;
    }
    const query = addressInput.trim();
    if (!query) {
      setLocationState("Bitte gib eine Adresse ein.");
      showToast({ variant: "info", title: "Adresse fehlt" });
      return;
    }
    setIsAddressSearching(true);
    setLocationState("Adresse wird gesucht...");
    try {
      const result = await searchAddressService(query);
      if (result.status === "unavailable") {
        setLocationState("Adresssuche derzeit nicht verfügbar. Bitte später erneut versuchen.");
        showToast({ variant: "error", title: "Adresssuche nicht verfügbar" });
        return;
      }
      if (result.status === "not_found") {
        setLocationState("Adresse nicht gefunden. Bitte genauer eingeben.");
        showToast({ variant: "info", title: "Adresse nicht gefunden" });
        return;
      }
      if (result.status === "invalid_coordinates") {
        setLocationState("Adresse konnte nicht aufgelöst werden.");
        showToast({ variant: "error", title: "Adressdaten ungültig" });
        return;
      }
      if (result.status !== "ok") return;
      setLat(result.lat);
      setLng(result.lng);
      setResolvedAddress(result.displayName);
      markerRef.current?.setLngLat([result.lng, result.lat]);
      mapRef.current?.flyTo({ center: [result.lng, result.lat], zoom: 14, duration: 700 });
      setLocationState("Adresse gefunden und Pin gesetzt.");
    } catch {
      setLocationState("Adresssuche fehlgeschlagen. Bitte Pin manuell setzen.");
      showToast({ variant: "error", title: "Adresssuche fehlgeschlagen" });
    } finally {
      setIsAddressSearching(false);
    }
  };

  const updateBringItem = (index: number, value: string) => {
    setBringItems((prev) => prev.map((entry, i) => (i === index ? value : entry)));
  };

  const addBringItem = () => setBringItems((prev) => [...prev, ""]);

  const removeBringItem = (index: number) => {
    setBringItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  return (
    <div className="surface-card space-y-5 rounded-2xl p-5">
      <div>
        <h2 className="text-base font-semibold text-[var(--foreground)]">Neues Event einreichen</h2>
        <p className={`mt-0.5 ${hintCls}`}>Wird vor der Veröffentlichung vom Admin geprüft.</p>
      </div>

      <form ref={formRef} action={formAction} className="space-y-5">

        {/* Basic info */}
        <div className="space-y-4">
          <SectionDivider label="Grundinfos" />

          {!isAuthenticated && (
            <div className="space-y-1.5">
              <label htmlFor="party-submitter-name" className={labelCls}>Dein Name *</label>
              <input
                id="party-submitter-name"
                name="submitterName"
                placeholder="z. B. Max Mustermann"
                maxLength={80}
                required
                className={fieldCls}
              />
              <p className={hintCls}>Wird im Admin-Panel angezeigt, damit wir euch zuordnen können.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="party-title" className={labelCls}>Titel *</label>
            <input
              id="party-title"
              name="title"
              placeholder="z. B. WG Warm-up Donnerstag"
              maxLength={120}
              required
              className={fieldCls}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="party-description" className={labelCls}>
              Beschreibung <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              id="party-description"
              name="description"
              placeholder="z. B. Musikrichtung, Dresscode, was schon da ist"
              className="field-surface min-h-24 w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="party-start" className={labelCls}>Startzeit *</label>
              <input
                id="party-start"
                name="startsAt"
                type="datetime-local"
                required
                className={fieldCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="party-end" className={labelCls}>Endzeit *</label>
              <input
                id="party-end"
                name="endsAt"
                type="datetime-local"
                required
                className={fieldCls}
              />
            </div>
          </div>
        </div>

        {/* Vibe */}
        <div className="space-y-4">
          <SectionDivider label="Vibe" />
          <div className="space-y-1.5">
            <label className={labelCls}>Stil</label>
            <div className="relative">
              <select
                name="vibeId"
                value={selectedVibeId}
                onChange={(e) => setSelectedVibeId(e.target.value)}
                className="field-surface h-12 w-full appearance-none rounded-2xl px-4 pr-10 text-sm font-medium outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              >
                {safeVibes.map((vibe) => (
                  <option key={vibe.id} value={String(vibe.id)}>
                    {getVibeEmoji(vibe.label)} {vibe.label}
                  </option>
                ))}
                <option value="__custom__">✨ Eigenen Vibe eingeben</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[var(--muted-foreground)]">⌄</span>
            </div>
            {selectedVibeId === "__custom__" ? (
              <div className="space-y-1">
                <input
                  name="customVibeLabel"
                  value={customVibeLabel}
                  onChange={(e) => setCustomVibeLabel(e.target.value)}
                  maxLength={48}
                  required
                  placeholder="z. B. Volleyball, Beerpong, Study Break"
                  className={fieldCls}
                />
                <p className={hintCls}>Dein eigener Vibe wird gespeichert und künftig auswählbar.</p>
              </div>
            ) : (
              <input type="hidden" name="customVibeLabel" value="" />
            )}
            <input type="hidden" name="defaultVibeId" value={String(safeVibes[0]?.id ?? "")} />
          </div>
        </div>

        {/* Capacity */}
        <div className="space-y-4">
          <SectionDivider label="Kapazität" />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="party-max-guests" className={labelCls}>Max. Gäste *</label>
              <input
                id="party-max-guests"
                name="maxGuests"
                type="number"
                min={1}
                max={200}
                defaultValue={20}
                required
                placeholder="20"
                className={fieldCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="party-contribution" className={labelCls}>Beitrag / Person (€)</label>
              <input
                id="party-contribution"
                name="contributionEur"
                type="number"
                step="0.5"
                min={0}
                defaultValue={5}
                required
                placeholder="5"
                className={fieldCls}
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-3">
          <SectionDivider label="Standort" />

          <div className="flex gap-2">
            <input
              id="party-address"
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAddressSearch(); } }}
              placeholder="z. B. Gartenstraße 12, Tübingen"
              className="field-surface h-11 min-w-0 flex-1 rounded-2xl px-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            />
            <button
              type="button"
              onClick={() => void handleAddressSearch()}
              disabled={isAddressSearching || !canLoadExternalServices}
              className={`${ghostBtnCls} h-11 shrink-0`}
            >
              {isAddressSearching ? "Suche..." : "Suchen"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleAutoLocation} className={`${ghostBtnCls} h-9 px-3 text-xs`}>
              📍 GPS
            </button>
            {!canLoadExternalServices && (
              <button
                type="button"
                onClick={() => {
                  setCookieConsent("accepted");
                  setCanLoadExternalServices(true);
                  setLocationState("Externe Dienste aktiviert.");
                }}
                className="inline-flex h-9 items-center rounded-xl bg-[var(--accent)] px-3 text-xs font-semibold text-white"
              >
                Karte aktivieren
              </button>
            )}
          </div>

          <p className={hintCls}>
            {locationState}
            {isReverseGeocoding ? " (wird aktualisiert...)" : ""}
          </p>
          {resolvedAddress ? <p className={`${hintCls} font-medium`}>✓ {resolvedAddress}</p> : null}

          {canLoadExternalServices ? (
            <div ref={mapContainerRef} className="h-44 w-full overflow-hidden rounded-2xl border border-[var(--border-soft)]" />
          ) : (
            <div className="grid h-44 w-full place-items-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 text-center text-xs text-[var(--muted-foreground)]">
              Karte deaktiviert — bitte Karte aktivieren.
            </div>
          )}
          <p className={hintCls}>
            Pin antippen/ziehen zum Anpassen · {formattedLat}, {formattedLng}
          </p>

          <input type="hidden" name="publicLat" value={formattedLat} />
          <input type="hidden" name="publicLng" value={formattedLng} />
          <input type="hidden" name="locationName" value={resolvedAddress || addressInput.trim()} />
        </div>

        {/* Bring list */}
        <div className="space-y-3">
          <SectionDivider label="Mitbring-Liste" />
          <p className={hintCls}>Optional: Was sollen Gäste mitbringen? z. B. Snacks, Becher, Mixer.</p>
          <div className="space-y-2">
            {bringItems.map((item, index) => (
              <div key={`bring-item-${index}`} className="flex gap-2">
                <input
                  name="bringItem"
                  value={item}
                  onChange={(e) => updateBringItem(index, e.target.value)}
                  placeholder={`Item ${index + 1}`}
                  className="field-surface h-11 flex-1 rounded-2xl px-4 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                />
                {bringItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBringItem(index)}
                    aria-label="Item entfernen"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] text-[var(--muted-foreground)] transition hover:border-rose-400 hover:text-rose-500 active:scale-[0.97]"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addBringItem}
            className={`${ghostBtnCls} h-9 px-3 text-xs`}
          >
            + Item hinzufügen
          </button>
        </div>

        <input type="hidden" name="publishMode" value="published" />

        <SubmitPartyButton />

        {actionState.message ? (
          <div
            className={`rounded-2xl px-3 py-2.5 text-sm ${
              actionState.ok
                ? "bg-[var(--success-soft)] text-emerald-600"
                : "bg-[rgba(239,68,68,0.10)] text-rose-500"
            }`}
          >
            {actionState.message}
          </div>
        ) : null}
      </form>
    </div>
  );
}
