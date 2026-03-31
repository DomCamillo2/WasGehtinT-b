import { AppShell } from "@/components/layout/app-shell";
import { SpontanFeed } from "@/components/spontan/spontan-feed";
import { createClient } from "@/lib/supabase/server";

type HangoutRow = {
  id: string;
  title: string;
  description: string;
  submitter_name?: string | null;
  location_text?: string | null;
  meetup_at?: string | null;
  review_status?: string | null;
  status?: string | null;
  is_published?: boolean | null;
  activity_type: "sport" | "chill" | "party" | "meetup" | "other";
  created_at: string;
  user_id: string;
  user_profiles: { display_name: string | null } | Array<{ display_name: string | null }> | null;
};

function parseLegacyHangoutDescription(description: string) {
  const match = description.match(/^Wo:\s*(.+)\nWann:\s*(.+)\n\n([\s\S]*)$/);
  if (!match) {
    return {
      locationText: null,
      meetupAt: null,
      cleanDescription: description,
    };
  }

  const [, locationText, meetupAtRaw, cleanDescription] = match;
  const parsedDate = new Date(meetupAtRaw.trim());

  return {
    locationText: locationText.trim() || null,
    meetupAt: Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString(),
    cleanDescription: cleanDescription.trim(),
  };
}

export default async function SpontanPage() {
  const supabase = await createClient();

  const queryWithNewFields = await supabase
    .from("hangouts")
    .select(
      "id, title, description, submitter_name, location_text, meetup_at, activity_type, created_at, user_id, review_status, status, is_published, user_profiles(display_name)",
    )
    .eq("review_status", "approved")
    .order("created_at", { ascending: false })
    .limit(60);

  const fallbackQuery = await (queryWithNewFields.error?.code === "42703" || queryWithNewFields.error?.code === "PGRST204"
    ? supabase
        .from("hangouts")
        .select(
          "id, title, description, submitter_name, location_text, meetup_at, activity_type, created_at, user_id, status, is_published, user_profiles(display_name)",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(60)
    : Promise.resolve({ data: null as null, error: null as null }));

  const legacyQuery = await ((fallbackQuery.error?.code === "42703" || fallbackQuery.error?.code === "PGRST204")
    ? supabase
        .from("hangouts")
        .select("id, title, description, submitter_name, activity_type, created_at, user_id, is_published, user_profiles(display_name)")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(60)
    : Promise.resolve({ data: null as null }));

  const data =
    queryWithNewFields.data ??
    fallbackQuery.data ??
    legacyQuery.data ??
    [];

  const items = ((data ?? []) as HangoutRow[]).map((row) => {
    const profile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
    const legacy = parseLegacyHangoutDescription(row.description);
    const locationText = row.location_text ?? legacy.locationText;
    const meetupAt = row.meetup_at ?? legacy.meetupAt;
    const description = row.location_text || row.meetup_at ? row.description : legacy.cleanDescription;

    return {
      id: row.id,
      title: row.title,
      description,
      location_text: locationText,
      meetup_at: meetupAt,
      activity_type: row.activity_type,
      created_at: row.created_at,
      user_display_name: profile?.display_name || row.submitter_name || "Gast",
    };
  });

  return (
    <AppShell>
      <SpontanFeed items={items} />
    </AppShell>
  );
}
