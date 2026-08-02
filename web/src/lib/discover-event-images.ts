import { unstable_cache } from "next/cache";
import { normalizeEnvSecret } from "@/lib/security";
import type { PartyCard } from "@/lib/types";

const PEXELS_ENDPOINT = "https://api.pexels.com/v1/search";
const IMAGE_REVALIDATE_SECONDS = 60 * 60 * 24 * 7; // 7 days — refresh safer selections sooner
/** Max distinct Pexels queries per request (deduped). */
export const MAX_DISCOVER_HERO_LOOKUPS_DEFAULT = 40;

export type DiscoverVisualCategory =
  | "club-night"
  | "live-music"
  | "market"
  | "community"
  | "culture"
  | "daytime"
  | "nightlife";

/**
 * Curated SFW Unsplash heroes per vibe. Used when Pexels is missing/unsafe/empty.
 * Never keyed off scraped event titles — only category.
 */
const CATEGORY_FALLBACK_HEROES: Record<DiscoverVisualCategory, readonly string[]> = {
  "club-night": [
    "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
  ],
  "live-music": [
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
  ],
  market: [
    "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80",
  ],
  community: [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
  ],
  culture: [
    "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
  ],
  daytime: [
    "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1200&q=80",
  ],
  nightlife: [
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80",
  ],
};

/** Safe English Pexels queries — no scraped titles (titles caused mismatched/NSFW-ish hits). */
const CATEGORY_PEXELS_QUERIES: Record<DiscoverVisualCategory, readonly string[]> = {
  "club-night": [
    "nightclub dance floor colorful lights europe",
    "dj booth neon club lights crowd",
    "electronic music festival stage lights",
  ],
  "live-music": [
    "live jazz band stage soft lights",
    "small concert venue musicians performing",
    "acoustic guitar live music club",
  ],
  market: [
    "european outdoor farmers market daytime",
    "flea market stalls sunny street",
    "fresh produce market europe",
  ],
  community: [
    "young adults cafe meetup friends laughing",
    "students studying together campus cafe",
    "friends hanging out outdoors europe",
  ],
  culture: [
    "theater audience stage performance",
    "art gallery exhibition visitors",
    "cinema theater seats empty elegant",
  ],
  daytime: [
    "european old town plaza sunny daytime",
    "outdoor summer festival daytime crowd",
    "historic german town square people walking",
  ],
  nightlife: [
    "city nightlife lights street evening europe",
    "concert crowd stage colorful lights",
    "bar nightlife ambience warm lights",
  ],
};

/**
 * Reject stock photos whose alt/description suggest adult, violent, political, or medical content.
 * Pexels has no safe-search flag — we filter client-side.
 */
const UNSAFE_ALT_PATTERN =
  /\b(nude|naked|nudes|lingerie|bikini|underwear|sensual|erotic|sexy|nsfw|porn|explicit|breast|nipple|butt|ass\b|genital|sex|bdsm|fetish|gore|bloody|corpse|gun|rifle|weapon|cigarette|cannabis|marijuana|cocain|heroin|drug deal|protest riot|nazi|swastika|isis|terror|autopsy|surgery bloody|tötet|nackt|erotisch|sexuell|porno|waffe|leiche|blutig)\b/i;

function hashStringToIndex(input: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % Math.max(1, modulo);
}

function compact(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function partyProbeText(party: PartyCard): string {
  return [
    party.title,
    party.description,
    party.vibe_label,
    party.location_name,
    party.music_genre,
    party.category_slug,
    party.category_label,
    party.event_scope,
  ]
    .map(compact)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function classifyDiscoverVisualCategory(party: PartyCard): DiscoverVisualCategory {
  const text = partyProbeText(party);
  const slug = compact(party.category_slug).toLowerCase();
  const scope = party.event_scope;

  if (party.is_community || slug === "community") {
    return "community";
  }

  if (
    slug === "market" ||
    slug === "flea-market" ||
    /\b(flohmarkt|wochenmarkt|markt|farmers?\s*market|basar|messe)\b/.test(text)
  ) {
    return "market";
  }

  if (
    /\b(jazz|jam\s*session|konzert|concert|quartett|trio|orchester|cello|piano|song\s*slam|acoustic|gitarre)\b/.test(
      text,
    ) ||
    /\b(jazz|rock|indie|classical)\b/i.test(compact(party.music_genre))
  ) {
    return "live-music";
  }

  if (
    /\b(theater|theatre|kabarett|lesung|film|kino|ausstellung|galerie|kunst|vortrag|literatur|kultur)\b/.test(
      text,
    ) ||
    slug === "culture"
  ) {
    return "culture";
  }

  if (
    scope === "nightlife" ||
    slug === "party" ||
    slug === "club" ||
    /\b(club|party|rave|techno|house|disco|dj|tanznacht|aftershow|nightclub|dancefloor)\b/.test(text)
  ) {
    if (/\b(techno|house|disco|rave|dj|tanznacht|clubhaus|schlachthaus|kuckuck)\b/.test(text)) {
      return "club-night";
    }
    return "nightlife";
  }

  if (scope === "daytime") {
    return "daytime";
  }

  return "daytime";
}

function pickCategoryFallback(category: DiscoverVisualCategory, eventId: string): string {
  const pool = CATEGORY_FALLBACK_HEROES[category];
  return pool[hashStringToIndex(eventId, pool.length)]!;
}

/** @deprecated Prefer category-aware pickDiscoverFallbackHeroUrlForParty */
export function pickDiscoverFallbackHeroUrl(eventId: string): string {
  return pickCategoryFallback("nightlife", eventId);
}

export function pickDiscoverFallbackHeroUrlForParty(party: PartyCard): string {
  return pickCategoryFallback(classifyDiscoverVisualCategory(party), party.id);
}

function buildSafePexelsQuery(party: PartyCard): string {
  const category = classifyDiscoverVisualCategory(party);
  const queries = CATEGORY_PEXELS_QUERIES[category];
  return queries[hashStringToIndex(party.id, queries.length)]!;
}

type PexelsPhoto = {
  id?: number;
  alt?: string | null;
  url?: string | null;
  src?: {
    landscape?: string;
    large2x?: string;
    large?: string;
    original?: string;
  };
};

type PexelsResponse = {
  photos?: PexelsPhoto[];
};

function normalizePexelsImageUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    if (url.hostname !== "images.pexels.com") return input;
    url.protocol = "https:";
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

function isSafePexelsPhoto(photo: PexelsPhoto): boolean {
  const haystack = `${photo.alt ?? ""} ${photo.url ?? ""}`;
  if (UNSAFE_ALT_PATTERN.test(haystack)) {
    return false;
  }
  // Empty alt is allowed but scored lower elsewhere.
  return true;
}

function pickSafePhotoUrl(photos: PexelsPhoto[], eventId: string): string | null {
  const safe = photos.filter(isSafePexelsPhoto);
  if (!safe.length) return null;

  // Prefer photos with descriptive, non-empty alt text.
  const ranked = [...safe].sort((a, b) => {
    const aAlt = (a.alt ?? "").trim().length;
    const bAlt = (b.alt ?? "").trim().length;
    return bAlt - aAlt;
  });

  const pick = ranked[hashStringToIndex(eventId, ranked.length)] ?? ranked[0];
  const best =
    pick?.src?.landscape ?? pick?.src?.large2x ?? pick?.src?.large ?? pick?.src?.original ?? null;
  return normalizePexelsImageUrl(best);
}

function getPexelsApiKey(): string | null {
  const key = normalizeEnvSecret(process.env.PEXELS_API_KEY);
  if (!key || key.toUpperCase() === "[SENSITIVE]" || key.length < 20) {
    return null;
  }
  return key;
}

async function fetchPexelsSafeLandscapeImage(query: string, eventId: string): Promise<string | null> {
  const apiKey = getPexelsApiKey();
  if (!apiKey || !query) return null;

  const url = new URL(PEXELS_ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("size", "large");
  url.searchParams.set("per_page", "12");
  // English queries are more predictable for stock safety than de-DE + scraped titles.
  url.searchParams.set("locale", "en-US");

  const response = await fetch(url.toString(), {
    headers: { Authorization: apiKey },
    next: { revalidate: IMAGE_REVALIDATE_SECONDS },
  });
  if (!response.ok) return null;

  const data = (await response.json()) as PexelsResponse;
  return pickSafePhotoUrl(data.photos ?? [], eventId);
}

const fetchPexelsSafeLandscapeImageCached = unstable_cache(
  async (query: string, eventId: string) => fetchPexelsSafeLandscapeImage(query, eventId),
  ["discover-pexels-image-v3-safe-categories"],
  { revalidate: IMAGE_REVALIDATE_SECONDS },
);

/**
 * Resolves hero image URLs for parties (category-safe Pexels + curated fallbacks).
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

  const apiKey = getPexelsApiKey();
  if (apiKey) {
    const queryByPartyId = new Map<string, string>();
    for (const party of parties) {
      queryByPartyId.set(party.id, buildSafePexelsQuery(party));
    }

    // Dedupe by query but still vary pick via eventId hash among candidates.
    const uniqueQueries = Array.from(new Set(Array.from(queryByPartyId.values()))).filter(Boolean);
    const limitedQueries = uniqueQueries.slice(0, Math.max(0, maxLookups));

    // One representative event id per query for cache key stability of the HTTP response,
    // then re-pick from the same candidate set is handled inside the fetch via eventId.
    // For shared queries, fetch once per (query, eventId) would explode — instead fetch by query
    // with a stable seed and let fallbacks differentiate visually by category/id.
    const imageByQuery = new Map<string, string | null>();
    await Promise.all(
      limitedQueries.map(async (query) => {
        const seedId = parties.find((p) => queryByPartyId.get(p.id) === query)?.id ?? query;
        const image = await fetchPexelsSafeLandscapeImageCached(query, seedId);
        imageByQuery.set(query, image);
      }),
    );

    for (const party of parties) {
      const query = queryByPartyId.get(party.id) ?? "";
      const hero = imageByQuery.get(query) ?? null;
      // Ignore any previously stored scraped/DB hero if we already have a safe stock pick;
      // category fallbacks beat mismatched legacy URLs.
      out[party.id] = hero;
    }
  }

  for (const party of parties) {
    if (!out[party.id]) {
      out[party.id] = pickDiscoverFallbackHeroUrlForParty(party);
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
