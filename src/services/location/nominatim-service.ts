"use client";

export type ReverseGeocodeStatus = "ok" | "unavailable" | "not_found";

export type ReverseGeocodeResult =
  | { status: "ok"; displayName: string }
  | { status: "unavailable" | "not_found" };

export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${encodeURIComponent(
      String(lat),
    )}&lon=${encodeURIComponent(String(lng))}`,
  );

  if (!response.ok) {
    return { status: "unavailable" };
  }

  const result = (await response.json()) as { display_name?: string };
  const displayName = (result.display_name ?? "").trim();

  if (!displayName) {
    return { status: "not_found" };
  }

  return { status: "ok", displayName };
}

export type SearchAddressStatus = "ok" | "unavailable" | "not_found" | "invalid_coordinates";

export type SearchAddressResult =
  | { status: "ok"; lat: number; lng: number; displayName: string }
  | { status: "unavailable" | "not_found" | "invalid_coordinates" };

export async function searchAddress(query: string): Promise<SearchAddressResult> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=de&q=${encodeURIComponent(query)}`,
  );

  if (!response.ok) {
    return { status: "unavailable" };
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
  }>;

  const first = results[0];
  if (!first) {
    return { status: "not_found" };
  }

  const lat = Number(first.lat);
  const lng = Number(first.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { status: "invalid_coordinates" };
  }

  return {
    status: "ok",
    lat,
    lng,
    displayName: first.display_name ?? query,
  };
}