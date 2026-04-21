export type SpontanActivityType = "sport" | "chill" | "party" | "meetup" | "other";

export type SpontanFeedRow = {
  id: string;
  title: string;
  description: string | null;
  location_text?: string | null;
  meetup_at?: string | null;
  activity_type: SpontanActivityType;
  created_at: string;
  user_display_name: string;
};

export type SpontanFeedItem = {
  id: string;
  title: string;
  description: string;
  locationText: string | null;
  meetupAt: string | null;
  activityType: SpontanActivityType;
  createdAt: string;
  userDisplayName: string;
};

export function mapSpontanFeedRowToItem(row: SpontanFeedRow): SpontanFeedItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    locationText: row.location_text ?? null,
    meetupAt: row.meetup_at ?? null,
    activityType: row.activity_type,
    createdAt: row.created_at,
    userDisplayName: row.user_display_name,
  };
}
