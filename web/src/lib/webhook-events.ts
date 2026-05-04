import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type WebhookEventRow = {
  event_id: string;
  event_type: string;
  livemode: boolean;
  processed_at: string | null;
  processing_error: string | null;
  created_at: string;
};

export async function getRecentWebhookEvents(limit = 50) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from("stripe_webhook_events")
    .select("event_id, event_type, livemode, processed_at, processing_error, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as WebhookEventRow[];
}
