import { getRecentWebhookEvents } from "@/lib/webhook-events";

export type WebhookEventViewModel = {
  eventId: string;
  eventType: string;
  livemode: boolean;
  processedAt: string | null;
  processingError: string | null;
  createdAt: string;
};

export async function loadHostWebhookEvents(limit = 50): Promise<WebhookEventViewModel[]> {
  const events = await getRecentWebhookEvents(limit);

  return events.map((event) => ({
    eventId: event.event_id,
    eventType: event.event_type,
    livemode: event.livemode,
    processedAt: event.processed_at,
    processingError: event.processing_error,
    createdAt: event.created_at,
  }));
}
