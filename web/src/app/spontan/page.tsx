import { AppShell } from "@/components/layout/app-shell";
import { SpontanFeed } from "@/components/spontan/spontan-feed";
import { getSupabasePublicServerClient } from "@/lib/supabase/public-server";
import { mapSpontanFeedRowToItem, type SpontanFeedItem, type SpontanFeedRow } from "@/services/spontan/spontan-feed-view-model";

async function loadSpontanFeedItems(): Promise<SpontanFeedItem[]> {
  try {
    const supabase = getSupabasePublicServerClient();
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("hangouts")
      .select("id, title, description, location_text, meetup_at, created_at")
      .or("review_status.eq.approved,status.eq.published,is_published.eq.true")
      .gte("meetup_at", nowIso)
      .order("meetup_at", { ascending: true })
      .limit(120);

    if (error) {
      console.error("[spontan/page] Failed to load feed:", error.message);
      return [];
    }

    const rows = (data ?? []) as Array<
      Omit<SpontanFeedRow, "user_display_name" | "activity_type"> & {
        user_display_name?: string | null;
      }
    >;

    return rows.map((row) =>
      mapSpontanFeedRowToItem({
        id: row.id,
        title: row.title,
        description: row.description,
        location_text: row.location_text ?? null,
        meetup_at: row.meetup_at ?? null,
        activity_type: "meetup",
        created_at: row.created_at,
        user_display_name: (row.user_display_name ?? "Community").trim() || "Community",
      }),
    );
  } catch (error) {
    console.error("[spontan/page] Unexpected load error:", error);
    return [];
  }
}

export default async function SpontanPage() {
  const items = await loadSpontanFeedItems();

  return (
    <AppShell theme="new">
      <SpontanFeed items={items} />
    </AppShell>
  );
}
