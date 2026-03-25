import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type DbRow = Record<string, unknown>;

type TableQueryBuilder = {
  select: (columns: string) => TableQueryBuilder;
  eq: (column: string, value: unknown) => TableQueryBuilder;
  maybeSingle: () => Promise<{ data: DbRow | null }>;
  insert: (values: DbRow) => Promise<unknown>;
  update: (values: DbRow) => TableQueryBuilder;
};

type AdminClientLike = {
  from: (table: string) => TableQueryBuilder;
};

function adminClient(): AdminClientLike {
  return getSupabaseAdmin() as unknown as AdminClientLike;
}

export async function getWebhookEventLog(eventId: string) {
  const supabaseAdmin = adminClient();
  const { data } = await supabaseAdmin
    .from("stripe_webhook_events")
    .select("event_id, processed_at")
    .eq("event_id", eventId)
    .maybeSingle();

  return data as { event_id: string; processed_at: string | null } | null;
}

export async function createWebhookEventLog(event: Stripe.Event) {
  const supabaseAdmin = adminClient();

  await supabaseAdmin.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    payload: event,
    processed_at: null,
    processing_error: null,
  });
}

export async function markWebhookEventProcessed(eventId: string) {
  const supabaseAdmin = adminClient();
  await supabaseAdmin
    .from("stripe_webhook_events")
    .update({ processed_at: new Date().toISOString(), processing_error: null })
    .eq("event_id", eventId);
}

export async function markWebhookEventFailed(eventId: string, errorMessage: string) {
  const supabaseAdmin = adminClient();
  await supabaseAdmin
    .from("stripe_webhook_events")
    .update({ processing_error: errorMessage, processed_at: null })
    .eq("event_id", eventId);
}

export async function processStripeEvent(event: Stripe.Event) {
  const supabaseAdmin = adminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const requestId = String(session.metadata?.party_request_id ?? "");

      const updatePayload = {
        status: "paid",
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
      };

      if (requestId) {
        await supabaseAdmin
          .from("party_request_payments")
          .update(updatePayload)
          .eq("party_request_id", requestId);
      } else {
        await supabaseAdmin
          .from("party_request_payments")
          .update(updatePayload)
          .eq("stripe_checkout_session_id", session.id);
      }
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await supabaseAdmin
        .from("party_request_payments")
        .update({ status: "cancelled" })
        .eq("stripe_checkout_session_id", session.id);
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await supabaseAdmin
        .from("party_request_payments")
        .update({ status: "failed" })
        .eq("stripe_payment_intent_id", intent.id);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : "";
      if (paymentIntentId) {
        await supabaseAdmin
          .from("party_request_payments")
          .update({ status: "refunded", refunded_at: new Date().toISOString() })
          .eq("stripe_payment_intent_id", paymentIntentId);
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
  const { data } = await supabaseAdmin
    .from("stripe_webhook_events")
    .select("event_id, payload, processed_at")
    .eq("event_id", eventId)
    .maybeSingle();

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
  } catch {
    await markWebhookEventFailed(eventId, "Retry fehlgeschlagen.");
  }
}
