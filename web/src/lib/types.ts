export type PartyStatus = "draft" | "published" | "closed" | "cancelled";

export type RequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "cancelled";

export type PartyCard = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  max_guests: number;
  contribution_cents: number;
  public_lat: number | null;
  public_lng: number | null;
  is_external: boolean;
  external_link: string | null;
  vibe_label: string;
  spots_left: number;
  /** Persisted to external_events_cache.source; drives source_badge after DB read */
  source?: string | null;
  location_name?: string | null;
  host_user_id?: string | null;
  host_avatar_url?: string | null;
  music_genre?: string | null;
  category_slug?: string | null;
  category_label?: string | null;
  event_scope?: "nightlife" | "daytime" | "mixed" | null;
  is_all_day?: boolean;
  audience_label?: string | null;
  price_info?: string | null;
  upvote_count?: number;
  upvoted_by_me?: boolean;
  source_badge?: string | null;
  is_community?: boolean;
  /** Optional hero image for Discover cards (e.g. from Pexels). */
  hero_image_url?: string | null;
};

export type BringProgress = {
  bring_item_id: string;
  item_name: string;
  quantity_needed: number;
  quantity_committed: number;
  quantity_open: number;
};

export type ChatPreview = {
  thread_id: string;
  party_id: string;
  party_request_id: string;
  host_user_id: string;
  guest_user_id: string;
  last_message_at: string | null;
  last_sender_user_id: string | null;
  last_message_body: string | null;
};
