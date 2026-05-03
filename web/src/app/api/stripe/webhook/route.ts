import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import {
  createWebhookEventLog,
  getWebhookEventLog,
  markWebhookEventFailed,
  markWebhookEventProcessed,
  processStripeEvent,
} from "@/lib/stripe-webhook-processor";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook nicht konfiguriert." }, { status: 400 });
  }

  const stripe = getStripe();
  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Ungültige Stripe-Signatur." }, { status: 400 });
  }

  const existingLog = await getWebhookEventLog(event.id);

  if (!existingLog) {
    await createWebhookEventLog(event);
  } else if (existingLog.processed_at) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await processStripeEvent(event);
    await markWebhookEventProcessed(event.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook-Verarbeitung fehlgeschlagen.";
    console.error("[stripe-webhook] Processing failed:", { eventId: event.id, message });
    await markWebhookEventFailed(event.id, message);
    return NextResponse.json({ error: "Webhook-Verarbeitung fehlgeschlagen." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
