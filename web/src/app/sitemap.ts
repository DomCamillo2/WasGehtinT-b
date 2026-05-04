import type { MetadataRoute } from "next";
import { getCommunityHangoutsForDiscover, getExternalEvents, getPublicParties } from "@/lib/data";
import { SITE_URL } from "@/lib/site-config";
import { getSupabasePublicServerClient } from "@/lib/supabase/public-server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/discover`,
      changeFrequency: "hourly",
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/feedback`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/impressum`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/datenschutz`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/nutzungsbedingungen`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  try {
    const supabase = getSupabasePublicServerClient();
    const nowIso = new Date().toISOString();
    const [publicParties, externalEvents, communityEvents] = await Promise.all([
      getPublicParties({ fromIso: nowIso }, supabase),
      getExternalEvents({ fromIso: nowIso }, supabase),
      getCommunityHangoutsForDiscover({ fromIso: nowIso }, supabase),
    ]);

    const eventRouteMap = new Map<string, MetadataRoute.Sitemap[number]>();

    for (const event of [...publicParties, ...externalEvents, ...communityEvents]) {
      const url = `${SITE_URL}/event/${String(event.id)}`;
      if (eventRouteMap.has(url)) {
        continue;
      }

      eventRouteMap.set(url, {
        url,
        lastModified: event.starts_at ? new Date(event.starts_at) : undefined,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }

    return [...staticRoutes, ...Array.from(eventRouteMap.values())];
  } catch (error) {
    console.error("[sitemap] Failed to generate sitemap:", error);
    return staticRoutes;
  }
}
