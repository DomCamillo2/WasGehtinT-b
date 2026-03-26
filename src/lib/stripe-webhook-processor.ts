import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type DbRow = Record<string, unknown>;

type DbResult<T> = Promise<{ data: T; error: { message?: string } | null }>;

type TableQueryBuilder = {
  select: (columns: string) => TableQueryBuilder;
  eq: (column: string, value: unknown) => TableQueryBuilder;
  maybeSingle: () => DbResult<DbRow | null>;
  single: () => DbResult<DbRow>;
  insert: (values: DbRow | DbRow[]) => DbResult<DbRow | null>;
  upsert: (
    values: DbRow | DbRow[],
    options?: { onConflict?: string },
  ) => DbResult<DbRow | null>;
  update: (values: DbRow) => TableQueryBuilder;
};

type AdminClientLike = {
  from: (table: string) => TableQueryBuilder;
};

function adminClient(): AdminClientLike {
  return getSupabaseAdmin() as unknown as AdminClientLike;
}

function hasRowId(row: DbRow | null): boolean {
  return typeof row?.id === "string" && row.id.length > 0;
}

export async function getWebhookEventLog(eventId: string) {
  const supabaseAdmin = adminClient();
  const { data, error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .select("event_id, processed_at")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    console.error("[stripe-webhook] Failed to read event log:", error);
    return null;
  }

  return data as { event_id: string; processed_at: string | null } | null;
}

export async function createWebhookEventLog(event: Stripe.Event) {
  const supabaseAdmin = adminClient();
  const { error } = await supabaseAdmin.from("stripe_webhook_events").upsert(
    {
      event_id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      payload: event,
      processed_at: null,
      processing_error: null,
    },
    { onConflict: "event_id" },
  );

  if (error) {
    console.error("[stripe-webhook] Failed to create event log:", error);
  }
}

export async function markWebhookEventProcessed(eventId: string) {
  const supabaseAdmin = adminClient();
  const { error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .update({ processed_at: new Date().toISOString(), processing_error: null })
    .eq("event_id", eventId)
    .select("event_id")
    .single();

  if (error) {
    console.error("[stripe-webhook] Failed to mark event processed:", error);
  }
}

export async function markWebhookEventFailed(eventId: string, errorMessage: string) {
  const supabaseAdmin = adminClient();
  const { error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .update({ processing_error: errorMessage, processed_at: null })
    .eq("event_id", eventId)
    .select("event_id")
    .single();

  if (error) {
    console.error("[stripe-webhook] Failed to mark event failed:", error);
  }
}

async function logStripeEventForManualReview(
  eventId: string,
  reason: string,
): Promise<void> {
  const supabaseAdmin = adminClient();
  const { error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .update({ processing_error: `Manual review required: ${reason}` })
    .eq("event_id", eventId)
    .select("event_id")
    .single();

  if (error) {
    console.error("[stripe-webhook] Failed to queue event for manual review:", error);
  }
}

export async function processStripeEvent(event: Stripe.Event) {
  const supabaseAdmin = adminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const requestId =
        typeof session.metadata?.party_request_id === "string"
          ? session.metadata.party_request_id
          : "";

      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      const updatePayload = {
        status: "paid",
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
      };

      if (!requestId && !session.id) {
        await logStripeEventForManualReview(event.id, "Missing request and session identifiers");
        throw new Error("Missing Stripe session identifiers");
      }

      if (requestId) {
        const { data, error } = await supabaseAdmin
          .from("party_request_payments")
          .update(updatePayload)
          .eq("party_request_id", requestId)
          .select("id")
          .single();

        if (error || !hasRowId(data)) {
          await logStripeEventForManualReview(event.id, "No payment row updated by party_request_id");
          throw new Error("Could not update payment by party_request_id");
        }
      } else {
        const { data, error } = await supabaseAdmin
          .from("party_request_payments")
          .update(updatePayload)
          .eq("stripe_checkout_session_id", session.id)
          .select("id")
          .single();

        if (error || !hasRowId(data)) {
          await logStripeEventForManualReview(
            event.id,
            "No payment row updated by stripe_checkout_session_id",
          );
          throw new Error("Could not update payment by stripe_checkout_session_id");
        }
      }

      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { data, error } = await supabaseAdmin
        .from("party_request_payments")
        .update({ status: "cancelled" })
        .eq("stripe_checkout_session_id", session.id)
        .select("id")
        .single();

      if (error || !hasRowId(data)) {
        throw new Error("Could not mark checkout session as cancelled");
      }

      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const { data, error } = await supabaseAdmin
        .from("party_request_payments")
        .update({ status: "failed" })
        .eq("stripe_payment_intent_id", intent.id)
        .select("id")
        .single();

      if (error || !hasRowId(data)) {
        throw new Error("Could not mark payment intent as failed");
      }

      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : "";
      if (paymentIntentId) {
        const { data, error } = await supabaseAdmin
          .from("party_request_payments")
          .update({ status: "refunded", refunded_at: new Date().toISOString() })
          .eq("stripe_payment_intent_id", paymentIntentId)
          .select("id")
          .single();

        if (error || !hasRowId(data)) {
          throw new Error("Could not mark payment as refunded");
        }
      }
      break;
    }
    default:
      break;
  }
}

function parseStoredEvent(payload: unknown): Stripe.Event | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const row = payload as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.type !== "string") {
    return null;
  }

  return payload as Stripe.Event;
}

export async function retryWebhookEventById(eventId: string) {
  const supabaseAdmin = adminClient();
  const { data, error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .select("event_id, payload, processed_at")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    console.error("[stripe-webhook] Failed to load event for retry:", error);
    return;
  }

  const eventRow = data as {
    event_id: string;
    payload: unknown;
    processed_at: string | null;
  } | null;

  if (!eventRow) {
    return;
  }

  if (eventRow.processed_at) {
    return;
  }

  const event = parseStoredEvent(eventRow.payload);
  if (!event) {
    await markWebhookEventFailed(eventId, "Ungültiges Event-Payload im Log.");
    return;
  }

  try {
    await processStripeEvent(event);
    await markWebhookEventProcessed(eventId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retry fehlgeschlagen.";
    await markWebhookEventFailed(eventId, `Retry fehlgeschlagen: ${message}`);
  }
}
