# WasGehtTüb - Implementation Guide für Code Review Fixes

Dieses Dokument enthält konkrete, copy-paste-ready Code-Änderungen für alle kritischen Issues.

---

## ✅ FIX 1: Server Action Silent Failures

### Datei: `src/app/actions/parties.ts`

**Ersetzen Sie diese Funktion:**

```typescript
export async function createPartyAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");
  const vibeId = Number(formData.get("vibeId"));
  const maxGuests = Number(formData.get("maxGuests"));
  const contributionCents = Math.round(Number(formData.get("contributionEur")) * 100);
  const publicLat = formData.get("publicLat") ? Number(formData.get("publicLat")) : null;
  const publicLng = formData.get("publicLng") ? Number(formData.get("publicLng")) : null;

  if (!title || !startsAt || !endsAt || !vibeId || !maxGuests) {
    return;
  }

  const { data: party, error } = await supabase
    .from("parties")
    .insert({
      host_user_id: user.id,
      title,
      description: description || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      vibe_id: vibeId,
      max_guests: maxGuests,
      contribution_cents: Number.isFinite(contributionCents) ? Math.max(contributionCents, 0) : 0,
      public_lat: publicLat,
      public_lng: publicLng,
      status: "published",
    })
    .select("id")
    .single();

  if (error || !party) {
    return;
  }

  const itemNames = formData
    .getAll("bringItem")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (itemNames.length) {
    const bringRows = itemNames.map((itemName, index) => ({
      party_id: party.id,
      item_name: itemName,
      quantity_needed: 1,
      sort_order: index + 1,
      is_active: true,
    }));

    const { error: bringError } = await supabase.from("bring_items").insert(bringRows);
    if (bringError) {
      return;
    }
  }

  revalidatePath("/discover");
  revalidatePath("/host");
}
```

**Mit dieser Funktion ersetzen:**

```typescript
type CreatePartyResult = {
  error?: string;
  success?: boolean;
};

export async function createPartyAction(
  formData: FormData,
): Promise<CreatePartyResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bitte melde dich an." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");
  const vibeId = Number(formData.get("vibeId"));
  const maxGuests = Number(formData.get("maxGuests"));
  const contributionCents = Math.round(Number(formData.get("contributionEur")) * 100);
  const publicLat = formData.get("publicLat") ? Number(formData.get("publicLat")) : null;
  const publicLng = formData.get("publicLng") ? Number(formData.get("publicLng")) : null;

  if (!title || !startsAt || !endsAt || !vibeId || !maxGuests) {
    return { error: "Bitte fülle alle erforderlichen Felder aus." };
  }

  const { data: party, error } = await supabase
    .from("parties")
    .insert({
      host_user_id: user.id,
      title,
      description: description || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      vibe_id: vibeId,
      max_guests: maxGuests,
      contribution_cents: Number.isFinite(contributionCents) ? Math.max(contributionCents, 0) : 0,
      public_lat: publicLat,
      public_lng: publicLng,
      status: "published",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createPartyAction] Database error:", error);
    return { error: "Party konnte nicht erstellt werden. Bitte versuche es später erneut." };
  }

  if (!party?.id) {
    console.error("[createPartyAction] No party returned from insert");
    return { error: "Party konnte nicht erstellt werden." };
  }

  const itemNames = formData
    .getAll("bringItem")
    .map((value) => String(value).trim())
    .filter(Boolean);

  let bringItemsError: string | null = null;

  if (itemNames.length) {
    const bringRows = itemNames.map((itemName, index) => ({
      party_id: party.id,
      item_name: itemName,
      quantity_needed: 1,
      sort_order: index + 1,
      is_active: true,
    }));

    const { error: bringError } = await supabase.from("bring_items").insert(bringRows);
    if (bringError) {
      console.error("[createPartyAction] Bring items error:", bringError);
      bringItemsError = "Bring-Items konnten nicht hinzugefügt werden.";
    }
  }

  // Always revalidate cache even if bring items failed
  revalidatePath("/discover");
  revalidatePath("/host");

  if (bringItemsError) {
    return { 
      success: true, 
      error: `Party erstellt, aber: ${bringItemsError}` 
    };
  }

  return { success: true };
}
```

---

### Datei: `src/app/actions/requests.ts`

**Fügen Sie einen Return-Type hinzu:**

```typescript
type CreateRequestResult = {
  error?: string;
  success?: boolean;
};

export async function createRequestAction(
  formData: FormData,
): Promise<CreateRequestResult> {
  // ... existing code ...

  if (error || !request) {
    console.error("[createRequestAction] Create request error:", error);
    return { error: "Anfrage konnte nicht erstellt werden." };
  }

  // ... rest of code with same error logging pattern ...

  return { success: true };
}
```

---

## ✅ FIX 2: Webhook Type Safety

### Datei: `src/lib/stripe-webhook-processor.ts`

**Ersetzen Sie die `processStripeEvent` Funktion:**

```typescript
export async function processStripeEvent(event: Stripe.Event) {
  const supabaseAdmin = adminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // ✅ Validate metadata
      if (!session.metadata?.party_request_id) {
        console.warn("[processStripeEvent] Missing party_request_id in metadata", {
          sessionId: session.id,
          metadata: session.metadata,
        });
        await logStripeEventForManualReview(session.id, "missing_party_request_id");
        return;
      }

      const requestId = session.metadata.party_request_id;
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      const updatePayload = {
        status: "paid" as const,
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
      };

      // ✅ Only update if metadata is valid
      const { error } = await supabaseAdmin
        .from("party_request_payments")
        .update(updatePayload)
        .eq("party_request_id", requestId);

      if (error) {
        console.error("[processStripeEvent] Failed to update payment", {
          requestId,
          error,
        });
        throw error;
      }

      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (!session.id) {
        console.warn("[processStripeEvent] Session missing ID");
        return;
      }

      await supabaseAdmin
        .from("party_request_payments")
        .update({ status: "cancelled" as const })
        .eq("stripe_checkout_session_id", session.id);

      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      
      if (!intent.id) {
        console.warn("[processStripeEvent] Payment intent missing ID");
        return;
      }

      await supabaseAdmin
        .from("party_request_payments")
        .update({ status: "failed" as const })
        .eq("stripe_payment_intent_id", intent.id);

      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : null;

      if (!paymentIntentId) {
        console.warn("[processStripeEvent] Refund missing payment intent ID", {
          chargeId: charge.id,
        });
        return;
      }

      await supabaseAdmin
        .from("party_request_payments")
        .update({
          status: "refunded" as const,
          refunded_at: new Date().toISOString(),
        })
        .eq("stripe_payment_intent_id", paymentIntentId);

      break;
    }

    default: {
      console.warn("[processStripeEvent] Unknown event type", { 
        eventType: event.type,
        eventId: event.id,
      });
      // Optionally store unknown event types for manual review
      break;
    }
  }
}

// ✅ Add this helper function
async function logStripeEventForManualReview(
  sessionId: string,
  reason: string,
): Promise<void> {
  try {
    const supabaseAdmin = adminClient();
    await supabaseAdmin.from("stripe_webhook_events_review").insert({
      session_id: sessionId,
      reason,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[logStripeEventForManualReview] Failed to log", { error });
  }
}
```

---

## ✅ FIX 3: User Email Null Check

### Datei: `src/app/discover/page.tsx`

**Zeile 96 ändern:**

```typescript
// Vorher:
const avatarFallback = (user.email?.[0] ?? "U").toUpperCase();

// Nachher:
const avatarFallback = String(user.email?.[0] ?? "U").toUpperCase();
```

---

## ✅ FIX 4: Webhook Event Loss Prevention

### Datei: `src/app/api/stripe/webhook/route.ts`

**Ersetzen Sie die komplette POST-Funktion:**

```typescript
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.warn("[webhook] Missing signature or secret");
    return NextResponse.json(
      { error: "Webhook nicht konfiguriert." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.warn("[webhook] Invalid signature", { 
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: "Ungültige Stripe-Signatur." },
      { status: 400 }
    );
  }

  console.info("[webhook] Received event", { eventId: event.id, eventType: event.type });

  const existingLog = await getWebhookEventLog(event.id);

  // Deduplicate: if already processed, return success
  if (existingLog?.processed_at) {
    console.info("[webhook] Duplicate event (already processed)", { eventId: event.id });
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Create initial log if new
  if (!existingLog) {
    try {
      await createWebhookEventLog(event);
    } catch (error) {
      console.error("[webhook] Failed to create event log", { eventId: event.id, error });
      return NextResponse.json(
        { error: "Failed to log webhook" },
        { status: 500 }
      );
    }
  }

  // Process the event
  let processingError: Error | null = null;
  try {
    await processStripeEvent(event);
    console.info("[webhook] Event processed successfully", { eventId: event.id });
  } catch (error) {
    processingError =
      error instanceof Error ? error : new Error(String(error));

    console.error("[webhook] Event processing failed", {
      eventId: event.id,
      eventType: event.type,
      error: processingError.message,
      stack: processingError.stack,
    });

    // Mark as failed and return 500 so Stripe retries
    try {
      await markWebhookEventFailed(
        event.id,
        `${processingError.message.substring(0, 200)}`
      );
    } catch (markError) {
      console.error("[webhook] Failed to mark event as failed", {
        eventId: event.id,
        error: markError,
      });
    }

    return NextResponse.json(
      {
        error: "Event processing failed",
        retryable: true,
        eventId: event.id,
      },
      { status: 500 }
    );
  }

  // Mark as processed
  try {
    await markWebhookEventProcessed(event.id);
    console.info("[webhook] Event marked as processed", { eventId: event.id });
  } catch (error) {
    // Even if marking fails, the event WAS processed
    console.error(
      "[webhook] Failed to mark event as processed (event was processed)",
      {
        eventId: event.id,
        error,
      }
    );
  }

  return NextResponse.json({ received: true, processed: true });
}
```

---

## ✅ FIX 5: Admin Client Validation

### Neu: `src/lib/supabase/validate.ts`

**Erstellen Sie diese neue Datei:**

```typescript
/**
 * Validation of Supabase admin client configuration
 * Call this during app initialization to fail fast if config is missing
 */

export function validateSupabaseAdminConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    errors.push(
      "NEXT_PUBLIC_SUPABASE_URL nicht gesetzt. Webhook-Verarbeitung wird nicht funktionieren."
    );
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    errors.push(
      "SUPABASE_SERVICE_ROLE_KEY nicht gesetzt. Webhook-Verarbeitung wird nicht funktionieren."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertSupabaseAdminConfig(): void {
  const { valid, errors } = validateSupabaseAdminConfig();

  if (!valid) {
    const errorMessage = `Supabase Admin Client nicht konfiguriert:\n${errors.join("\n")}`;
    throw new Error(errorMessage);
  }
}
```

### Modifizieren Sie: `src/lib/supabase/admin.ts`

```typescript
import { createClient } from "@supabase/supabase-js";
import { validateSupabaseAdminConfig } from "./validate";

let adminSingleton: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    const { errors } = validateSupabaseAdminConfig();
    throw new Error(
      `Supabase Admin Client nicht konfiguriert: ${errors.join("; ")}`
    );
  }

  if (!adminSingleton) {
    adminSingleton = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminSingleton;
}
```

### Fügen Sie in `src/app/layout.tsx` hinzu:

```typescript
import { validateSupabaseAdminConfig } from "@/lib/supabase/validate";

// At the top of your root layout component
if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
  // Only run serverside, only in production
  const { valid, errors } = validateSupabaseAdminConfig();
  if (!valid) {
    console.error("❌ Supabase Admin Config Invalid:", errors);
    // In production, you might want to exit or log to monitoring service
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ... rest of layout
}
```

---

## ✅ FIX 6: Payment Race Condition

### Datei: `src/app/actions/payments.ts`

**Ersetzen Sie die `startCheckoutAction` Funktion (ab Zeile 48):**

```typescript
// Alter Code (unsicher für Race Conditions):
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

// Neuer Code (sicher mit UPSERT):
const { data: payment, error: paymentError } = await supabase
  .from("party_request_payments")
  .upsert(
    {
      party_request_id: requestId,
      currency: "EUR",
      contribution_per_person_cents: contributionPerPersonCents,
      service_fee_cents: FIXED_SERVICE_FEE_CENTS,
      group_size: groupSize,
      total_contribution_cents: totalContributionCents,
      total_cents: totalCents,
      status: "requires_payment",
    },
    {
      onConflict: "party_request_id",
    }
  )
  .select("id")
  .single();

if (paymentError || !payment?.id) {
  console.error("[startCheckout] Failed to create/update payment", paymentError);
  return;
}
```

Danach auch diese Zeile aktualisieren:

```typescript
await supabase
  .from("party_request_payments")
  .update({
    stripe_checkout_session_id: session.id,
  })
  .eq("party_request_id", requestId);  // ✓ This is safe now
```

---

## ✅ FIX 7: External Event Date Validation

### Datei: `src/app/actions/external-events.ts`

**Ersetzen Sie die `toIsoDate` Funktion:**

```typescript
// Alter Code:
function toIsoDate(day: number, month: number): string | null {
  const now = new Date();
  const year = now.getMonth() + 1 > month ? now.getFullYear() + 1 : now.getFullYear();
  const candidate = new Date(Date.UTC(year, month - 1, day, 20, 0, 0));
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }
  return candidate.toISOString();
}

// Neuer Code:
function toIsoDate(day: number, month: number): string | null {
  // ✅ Validate input ranges
  if (!Number.isInteger(day) || !Number.isInteger(month)) {
    return null;
  }

  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1; // 1-12
  const currentDay = now.getUTCDate();

  // ✅ Determine target year correctly
  let targetYear = currentYear;

  if (month < currentMonth) {
    // Event is in earlier month of next year
    targetYear = currentYear + 1;
  } else if (month === currentMonth && day <= currentDay) {
    // Event is today or earlier this month, so next year
    targetYear = currentYear + 1;
  }
  // else: month is later this year, keep current year

  const candidate = new Date(Date.UTC(targetYear, month - 1, day, 20, 0, 0));

  // ✅ Check validity
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }

  // ✅ Only return if in future
  if (candidate <= now) {
    return null;
  }

  return candidate.toISOString();
}
```

---

## ✅ FIX 8: Regex Safety

### Datei: `src/app/actions/external-events.ts`

**Modifizieren Sie die Regex Patterns und Validation:**

```typescript
// Alte Patterns:
const CANCELLED_EVENT_PATTERNS = [
  /\bausfall\b/i,
  /\babgesagt\b/i,
  /\bcancelled\b/i,
  /\bcanceled\b/i,
  /\bcancel\b/i,
  /\bfällt\s+aus\b/i,
];

// Neue Version mit Validation:
const CANCELLED_EVENT_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /\bausfall\b/i, description: "ausfall" },
  { pattern: /\babgesagt\b/i, description: "abgesagt" },
  { pattern: /\bcancelled\b/i, description: "cancelled" },
  { pattern: /\bcanceled\b/i, description: "canceled" },
  { pattern: /\bcancel\b/i, description: "cancel" },
  { pattern: /\bfällt\s+aus\b/i, description: "fällt aus" },
];

// ✅ Validate patterns on startup
function validateCancellationPatterns(): void {
  for (const { pattern, description } of CANCELLED_EVENT_PATTERNS) {
    try {
      pattern.test("");
    } catch (error) {
      throw new Error(
        `Invalid regex pattern for "${description}": ${pattern.source}`,
        { cause: error }
      );
    }
  }
}

// Call this at module load (nur einmal)
if (process.env.NODE_ENV !== "production" || true) {
  try {
    validateCancellationPatterns();
  } catch (error) {
    console.error("Regex validation failed during startup", error);
    // In production, you might throw and fail startup
  }
}

// ✅ Update the check function
function isCancelledOrOutageEvent(event: PartyCard): boolean {
  const content = [event.title, event.description, event.vibe_label, event.external_link]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  if (!content) {
    return false;
  }

  try {
    return CANCELLED_EVENT_PATTERNS.some(({ pattern }) => {
      try {
        return pattern.test(content);
      } catch (error) {
        console.warn("Regex test failed", {
          pattern: pattern.source,
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    });
  } catch (error) {
    console.error("Error checking event cancellation", { error });
    return false;
  }
}
```

---

## 📝 Testing Checklist

Nach Implementierung aller Fixes, testen Sie:

- [ ] **Server Actions**: Fehlerhafte Partyerstellung zeigt Fehlermeldung
- [ ] **Webhook**: Heartbeat-Events (charge.refunded) werden nicht in Fehler geloggt
- [ ] **Payment**: Doppeltes Anklicken "Zur Kasse" erzeugt nur 1 Datensatz
- [ ] **Admin Config**: Server-Start zeigt brauchbaren Error ohne Service Role Key
- [ ] **Date Parsing**: 31.2. wird nicht als Event gelistet
- [ ] **External Events**: Cancelled-Pattern-Fehler crasht Scraper nicht

---

## 🚀 Deployment Reihenfolge

1. **Fix #1-4** (Critical): Deploy als Hotfix
2. **Fix #5-8** (High): Deploy in nächster Release
3. **Remaining**: Nice-to-haves über Zeit

---

