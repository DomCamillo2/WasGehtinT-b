"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

const FIXED_SERVICE_FEE_CENTS = 50;

export async function startCheckoutAction(formData: FormData): Promise<void> {
  const requestId = String(formData.get("partyRequestId") ?? "");
  if (!requestId) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: requestRow } = await supabase
    .from("party_requests")
    .select("id, requester_user_id, group_size, status, party_id")
    .eq("id", requestId)
    .single();

  if (!requestRow || requestRow.requester_user_id !== user.id || requestRow.status !== "accepted") {
    return;
  }

  const { data: party } = await supabase
    .from("parties")
    .select("id, title, contribution_cents")
    .eq("id", requestRow.party_id)
    .maybeSingle();

  if (!party) {
    return;
  }

  const contributionPerPersonCents = Number(party.contribution_cents ?? 0);
  const groupSize = Number(requestRow.group_size ?? 1);
  const totalContributionCents = contributionPerPersonCents * groupSize;
  const totalCents = totalContributionCents + FIXED_SERVICE_FEE_CENTS;

  const { data: paymentExisting } = await supabase
    .from("party_request_payments")
    .select("id, status")
    .eq("party_request_id", requestId)
    .maybeSingle();

  if (!paymentExisting) {
    await supabase.from("party_request_payments").insert({
      party_request_id: requestId,
      currency: "EUR",
      contribution_per_person_cents: contributionPerPersonCents,
      service_fee_cents: FIXED_SERVICE_FEE_CENTS,
      group_size: groupSize,
      total_contribution_cents: totalContributionCents,
      total_cents: totalCents,
      status: "requires_payment",
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${appUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/requests`,
    metadata: {
      party_request_id: requestId,
      party_id: party.id,
      requester_user_id: user.id,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: totalContributionCents,
          product_data: {
            name: `Umlage für ${party.title}`,
            description: `Gruppengröße: ${groupSize}`,
          },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: FIXED_SERVICE_FEE_CENTS,
          product_data: {
            name: "Service-Gebühr",
          },
        },
      },
    ],
  });

  await supabase
    .from("party_request_payments")
    .update({
      stripe_checkout_session_id: session.id,
    })
    .eq("party_request_id", requestId);

  if (session.url) {
    redirect(session.url);
  }
}

export async function confirmCheckoutBySession(sessionId: string): Promise<void> {
  if (!sessionId) {
    return;
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return;
  }

  const requestId = String(session.metadata?.party_request_id ?? "");
  if (!requestId) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("party_request_payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
    })
    .eq("party_request_id", requestId);

  revalidatePath("/requests");
}
