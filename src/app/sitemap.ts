import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = "https://wasgehttueb.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("v_external_events_public")
      .select("id, starts_at")
      .order("starts_at", { ascending: true });

    if (error) {
      console.error("[sitemap] Failed to fetch external event IDs:", error.message);
      return [];
    }

    return ((data ?? []) as Array<{ id: string | number; starts_at: string | null }>).map((event) => ({
      url: `${SITE_URL}/event/${String(event.id)}`,
      lastModified: event.starts_at ? new Date(event.starts_at) : undefined,
    }));
  } catch (error) {
    console.error("[sitemap] Failed to generate sitemap:", error);
    return [];
  }
}
