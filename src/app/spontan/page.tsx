import { AppShell } from "@/components/layout/app-shell";
import { SpontanFeed } from "@/components/spontan/spontan-feed";
import { requireUser } from "@/lib/data";

type HangoutRow = {
  id: string;
  title: string;
  description: string;
  activity_type: "sport" | "chill" | "party" | "meetup" | "other";
  created_at: string;
  user_id: string;
  user_profiles: { display_name: string | null } | Array<{ display_name: string | null }> | null;
};

export default async function SpontanPage() {
  const { supabase } = await requireUser();

  const { data } = await supabase
    .from("hangouts")
    .select("id, title, description, activity_type, created_at, user_id, user_profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(60);

  const items = ((data ?? []) as HangoutRow[]).map((row) => {
    const profile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;

    return {
    id: row.id,
    title: row.title,
    description: row.description,
    activity_type: row.activity_type,
    created_at: row.created_at,
    user_display_name: profile?.display_name || "Studi",
  };
  });

  return (
    <AppShell>
      <SpontanFeed items={items} />
    </AppShell>
  );
}
