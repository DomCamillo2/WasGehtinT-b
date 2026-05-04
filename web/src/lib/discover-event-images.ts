import { unstable_cache } from "next/cache";
import type { PartyCard } from "@/lib/types";

const PEXELS_ENDPOINT = "https://api.pexels.com/v1/search";
const IMAGE_REVALIDATE_SECONDS = 60 * 60 * 24 * 14; // 14 days
/** Max distinct Pexels queries per request (deduped). API route may use a higher cap than legacy SSR. */
export const MAX_DISCOVER_HERO_LOOKUPS_DEFAULT = 40;

const unsplash = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=80`;

/**
 * Generic nightlife / city events (legacy pool — still used for default + party-like themes).
 * Next/Image allows `images.unsplash.com` via `next.config.ts` remotePatterns.
 */
const DISCOVER_FALLBACK_HERO_URLS_NIGHT = [
  unsplash("photo-1492684223066-81342ee5ff30"),
  unsplash("photo-1514525253161-7a46d19cd819"),
  unsplash("photo-1540575467063-178a50c2df87"),
  unsplash("photo-1470229722913-7c0e2dbbafd3"),
  unsplash("photo-1533174072545-7a4b6ad7a6c3"),
  unsplash("photo-1506157786151-b8492531f063"),
] as const;

/** When Pexels and DB have no image: themed Unsplash heroes matching category / scope (deterministic per event id). */
const HERO_FALLBACKS_BY_THEME = {
  politics: [
    unsplash("photo-1521737604893-d14cc237f11d"),
    unsplash("photo-1529156069898-49953e39b3ac"),
    unsplash("photo-1522071820081-009f0129c71c"),
  ],
  workshop: [
    unsplash("photo-1522202176988-66273c2fd55f"),
    unsplash("photo-1517245386807-bb43f82c33c4"),
    unsplash("photo-1519389950473-47ba0277781c"),
  ],
  culture: [
    unsplash("photo-1513475382583-d06e58bcb0e0"),
    unsplash("photo-1561214115-f7f146658585"),
    unsplash("photo-1460661255046-b784098c85d8"),
  ],
  film: [
    unsplash("photo-1489599849927-2ee91cede3ba"),
    unsplash("photo-1536440136628-849c177d76a1"),
    unsplash("photo-1478720568477-152d9b164e26"),
  ],
  concert: [
    unsplash("photo-1470229722913-7c0e2dbbafd3"),
    unsplash("photo-1501281668745-f7f57905c8e4"),
    unsplash("photo-1459749411175-04bf5292ceea"),
  ],
  party: [...DISCOVER_FALLBACK_HERO_URLS_NIGHT],
  community: [
    unsplash("photo-1523301346568-339d6e7a1c5c"),
    unsplash("photo-1511632765586-9fac85bbf809"),
    unsplash("photo-1529156069898-49953e39b3ac"),
  ],
  "flea-market": [
    unsplash("photo-1560493670016-50692c5dad05"),
    unsplash("photo-1441986300917-64679bdacae4"),
    unsplash("photo-1555529902-5bbdc472879c"),
  ],
  market: [
    unsplash("photo-1489515217757-5fd1be406fef"),
    unsplash("photo-1542838132-92c53300491e"),
    unsplash("photo-1486297678162-eb2a19b0a32d"),
  ],
  daytime: [
    unsplash("photo-1469334031218-e382a71b716b"),
    unsplash("photo-1514525253161-7a46d19cd819"),
    unsplash("photo-1517245386807-bb43f82c33c4"),
  ],
  nightlife: [...DISCOVER_FALLBACK_HERO_URLS_NIGHT],
  "music-genre": [...DISCOVER_FALLBACK_HERO_URLS_NIGHT],
  default: [...DISCOVER_FALLBACK_HERO_URLS_NIGHT],
} as const;

export type DiscoverHeroTheme = keyof typeof HERO_FALLBACKS_BY_THEME;

function hashStringToIndex(input: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % modulo;
}

function compact(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeSlug(slug: string | null | undefined): string | null {
  const s = compact(slug).toLowerCase();
  return s.length ? s : null;
}

/** Heuristic theme from title/description when DB category is missing or "other". */
function inferDiscoverHeroThemeFromCopy(party: PartyCard): DiscoverHeroTheme | null {
  const text = `${compact(party.title)} ${compact(party.description)}`.toLowerCase();
  if (!text.trim()) return null;
  if (/\b(flohmarkt|trödel|trodel|antikmarkt)\b/i.test(text)) return "flea-market";
  if (/\b(weihnachtsmarkt|wochenmarkt|stadtmarkt|regionalmarkt|kunstmarkt)\b/i.test(text)) return "market";
  if (/\bmarkt\b/i.test(text) && !/\b(supermarkt|telemarkt)\b/i.test(text)) return "market";
  if (/\b(konzert|open\s*air(?!\s*photo)|live\s*music|orchester|gesang)\b/i.test(text)) return "concert";
  if (/\b(workshop|skillshare|seminar(?!\s*software)|kurs\b)\b/i.test(text)) return "workshop";
  if (/\b(film(?!\s*museum)|kino|screening|premiere|doku)\b/i.test(text)) return "film";
  if (/\b(demo|kundgebung|solidar|infoabend|plenum|politik|diskussion|lesung\s+polit)\b/i.test(text)) {
    return "politics";
  }
  if (/\b(vernissage|ausstellung(?!\s*hall)|museum|galerie|theaterstück|poetry)\b/i.test(text)) return "culture";
  if (/\b(party|rave|club\s*night|aftershow|techno|dj\s*set|tanz\s*in\s*den)\b/i.test(text)) return "party";
  return null;
}

function inferDiscoverHeroTheme(party: PartyCard): DiscoverHeroTheme {
  const slug = normalizeSlug(party.category_slug);

  if (slug && slug !== "other") {
    if (slug === "politics" || slug === "politik") return "politics";
    if (slug === "workshop") return "workshop";
    if (slug === "culture" || slug === "kultur") return "culture";
    if (slug === "film") return "film";
    if (slug === "concert" || slug === "konzert") return "concert";
    if (slug === "party") return "party";
    if (slug === "community") return "community";
    if (slug === "flea-market" || slug === "flohmarkt") return "flea-market";
    if (slug === "market" || slug === "markt") return "market";
  }

  const fromCopy = inferDiscoverHeroThemeFromCopy(party);
  if (fromCopy) return fromCopy;

  if (party.is_community) return "community";

  if (party.event_scope === "daytime") return "daytime";
  if (party.event_scope === "nightlife") return "nightlife";

  if (compact(party.music_genre)) return "music-genre";

  return "default";
}

/** Stable fallback hero per event (used when Pexels/DB have no image). */
export function pickDiscoverFallbackHeroUrl(party: PartyCard): string {
  const theme = inferDiscoverHeroTheme(party);
  const pool = HERO_FALLBACKS_BY_THEME[theme] ?? HERO_FALLBACKS_BY_THEME.default;
  const i = hashStringToIndex(party.id, pool.length);
  return pool[i]!;
}

/** Pexels search lead phrases — tuned so results match event type (not every daytime event → nightclub). */
const PEXELS_LEAD_BY_THEME: Record<DiscoverHeroTheme, string> = {
  politics: "town hall community meeting political discussion diverse audience europe",
  workshop: "creative workshop people learning hands on classroom maker space",
  culture: "art gallery exhibition museum visitors culture sculpture painting",
  film: "cinema movie theater dark hall audience screen projection",
  concert: "live music concert stage lights crowd festival band performance",
  party: "nightclub dance floor colorful lights dj crowd nightlife energy",
  community: "community friends gathering outdoor park picnic daytime social",
  "flea-market": "flea market vintage stalls street fair second hand antiques outdoor",
  market: "farmers market food stalls outdoor market colorful produce street europe",
  daytime: "sunny city square street festival daytime crowd europe germany",
  nightlife: "nightclub neon lights night party club dj crowd",
  "music-genre": "",
  default: "city festival crowd celebration colorful outdoor event europe",
};

function buildDiscoverImageQuery(party: PartyCard): string {
  const title = compact(party.title);
  const venue = compact(party.location_name) || compact(party.vibe_label);
  const genre = compact(party.music_genre);
  const theme = inferDiscoverHeroTheme(party);

  if (theme === "music-genre" && genre) {
    return `${genre} music live performance stage lighting festival ${venue}`.replace(/\s+/g, " ").trim();
  }

  const lead =
    theme === "music-genre"
      ? PEXELS_LEAD_BY_THEME.nightlife
      : (PEXELS_LEAD_BY_THEME[theme] ?? PEXELS_LEAD_BY_THEME.default);

  return `${lead} ${title} ${venue}`.replace(/\s+/g, " ").trim();
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
  ["discover-pexels-image-v2"],
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
      out[party.id] = pickDiscoverFallbackHeroUrl(party);
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
