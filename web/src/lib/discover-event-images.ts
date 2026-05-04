import { unstable_cache } from "next/cache";
import type { PartyCard } from "@/lib/types";

const PEXELS_ENDPOINT = "https://api.pexels.com/v1/search";
const IMAGE_REVALIDATE_SECONDS = 60 * 60 * 24 * 14; // 14 days
/** Max distinct Pexels queries per request (deduped). API route may use a higher cap than legacy SSR. */
export const MAX_DISCOVER_HERO_LOOKUPS_DEFAULT = 40;

/**
 * Deterministic stock URLs (no API key) when Pexels is unavailable or returns nothing.
 * Next/Image allows `images.unsplash.com` via `next.config.ts` remotePatterns.
 */
const DISCOVER_FALLBACK_HERO_URLS = [
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1506157786151-b8492531f063?auto=format&fit=crop&w=1200&q=80",
] as const;

function hashStringToIndex(input: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % modulo;
}

/** Stable fallback hero per event id (used when Pexels/DB have no image). */
export function pickDiscoverFallbackHeroUrl(eventId: string): string {
  const i = hashStringToIndex(eventId, DISCOVER_FALLBACK_HERO_URLS.length);
  return DISCOVER_FALLBACK_HERO_URLS[i]!;
}

type PexelsResponse = {
  photos?: Array<{
    src?: {
      landscape?: string;
      large2x?: string;
      large?: string;
      original?: string;
    };
  }>;
};

function normalizePexelsImageUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    if (url.hostname !== "images.pexels.com") return input;
    // Some feeds return http URLs; force https so Next/Image remote rules and browsers accept them consistently.
    url.protocol = "https:";
    // Prefer deterministic 16:9 crops and compressed payloads for stable card rendering.
    url.searchParams.set("auto", "compress");
    url.searchParams.set("cs", "tinysrgb");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("w", "960");
    url.searchParams.set("h", "540");
    return url.toString();
  } catch {
    return input;
  }
}

function compact(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function buildDiscoverImageQuery(party: PartyCard): string {
  const genre = compact(party.music_genre);
  const venue = compact(party.location_name) || compact(party.vibe_label);
  const title = compact(party.title);

  if (party.is_community) {
    return `${title} ${venue} community meetup young people germany`;
  }
  if (party.event_scope === "daytime") {
    return `${title} ${venue} colorful city daytime event crowd germany`;
  }
  if (genre) {
    return `${genre} colorful nightclub dj crowd dancefloor germany`;
  }
  return `${title} ${venue} colorful nightlife event crowd germany`;
}

async function fetchPexelsLandscapeImage(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey || !query) return null;

  const url = new URL(PEXELS_ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("size", "large");
  url.searchParams.set("per_page", "1");
  url.searchParams.set("locale", "de-DE");

  const response = await fetch(url.toString(), {
    headers: { Authorization: apiKey },
    next: { revalidate: IMAGE_REVALIDATE_SECONDS },
  });
  if (!response.ok) return null;

  const data = (await response.json()) as PexelsResponse;
  const first = data.photos?.[0];
  const best = first?.src?.landscape ?? first?.src?.large2x ?? first?.src?.large ?? first?.src?.original ?? null;
  return normalizePexelsImageUrl(best);
}

const fetchPexelsLandscapeImageCached = unstable_cache(
  async (query: string) => fetchPexelsLandscapeImage(query),
  ["discover-pexels-image-v1"],
  { revalidate: IMAGE_REVALIDATE_SECONDS },
);

/**
 * Resolves hero image URLs for parties (Pexels + unstable_cache by query).
 * Does not mutate input; safe from route handlers after first paint.
 */
export async function resolveDiscoverHeroImagesForParties(
  parties: PartyCard[],
  maxLookups: number = MAX_DISCOVER_HERO_LOOKUPS_DEFAULT,
): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  if (!parties.length) {
    return out;
  }

  if (process.env.PEXELS_API_KEY) {
    const queryByPartyId = new Map<string, string>();
    for (const party of parties) {
      queryByPartyId.set(party.id, buildDiscoverImageQuery(party));
    }

    const uniqueQueries = Array.from(new Set(Array.from(queryByPartyId.values()))).filter(Boolean);
    const limitedQueries = uniqueQueries.slice(0, Math.max(0, maxLookups));
    const imageByQuery = new Map<string, string | null>();

    await Promise.all(
      limitedQueries.map(async (query) => {
        const image = await fetchPexelsLandscapeImageCached(query);
        imageByQuery.set(query, image);
      }),
    );

    for (const party of parties) {
      const query = queryByPartyId.get(party.id) ?? "";
      const hero = imageByQuery.get(query) ?? null;
      out[party.id] = hero ?? party.hero_image_url ?? null;
    }
  } else {
    for (const p of parties) {
      out[p.id] = p.hero_image_url ?? null;
    }
  }

  for (const party of parties) {
    const current = out[party.id];
    if (!current) {
      out[party.id] = pickDiscoverFallbackHeroUrl(party.id);
    }
  }

  return out;
}

/**
 * @deprecated Prefer client `/api/discover/hero-images` + `resolveDiscoverHeroImagesForParties` so discover SSR is not blocked by Pexels.
 */
export async function enrichPartiesWithDiscoverHeroImages(parties: PartyCard[]): Promise<PartyCard[]> {
  if (!parties.length) return parties;
  const map = await resolveDiscoverHeroImagesForParties(parties, MAX_DISCOVER_HERO_LOOKUPS_DEFAULT);
  return parties.map((party) => ({
    ...party,
    hero_image_url: map[party.id] ?? party.hero_image_url ?? null,
  }));
}
