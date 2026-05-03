# WasGehtTüb - Best Practices & Architecture Patterns

Dieses Dokument enthält Richtlinien, um zukünftige Bugs zu vermeiden.

---

## Aktueller Delivery-Fokus

Bis auf Weiteres priorisieren wir Architektur- und Produktarbeit in dieser Reihenfolge:

1. External Events automatisch sammeln
2. External Events sauber normalisieren und persistieren
3. Discover- und Event-UI/UX für diesen Flow optimieren

Derzeit nicht im Scope:

- unreleased Chat-Flow
- unreleased Payments-Flow
- nachrangige Refactors in angrenzenden Features, sofern sie den Event-Flow nicht blockieren

Wenn Prioritäten kollidieren, gewinnt der End-to-End-Flow `Quelle -> Scraper/Sync -> Persistenz -> Discover -> Event-Detailseite`.

---

## 🎯 Philosophie: Fail-Safe by Default

**Motto**: "Explizit fehlschlagen > Stillschweigend fehlschlagen"

### ❌ Anti-Pattern:
```typescript
if (error) {
  return;  // Silently fails
}
```

### ✅ Pattern:
```typescript
if (error) {
  // Communicate the failure
  const message = error.message || "Unbekannter Fehler";
  console.error("[functionName] Failed:", message);
  
  // Return error to caller
  return { error: message };
}
```

---

## 📋 Server Actions Pattern

Alle Server Actions sollten einen konsistenten Error-Handling-Typ verwenden:

```typescript
// ✅ Recommended signature
type ActionResult<T = void> = {
  success?: true;
  data?: T;
  error?: string;
};

export async function myAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  // Validation
  if (!isValid(formData)) {
    return { error: "Invalid input" };
  }

  // Database operation
  const { data, error } = await supabase.from("table").insert(...).single();

  if (error) {
    console.error("[myAction] Database error:", error);
    return { error: "Failed to create. Please try again." };
  }

  if (!data?.id) {
    return { error: "No ID returned from database" };
  }

  // Cache invalidation
  revalidatePath("/affected-page");

  return { success: true, data };
}

// ✅ Client usage
"use client";
const [error, setError] = useState("");

async function handleSubmit() {
  const result = await myAction(formData);
  
  if (result.error) {
    setError(result.error);
    return;
  }
  
  // Success - show confirmation
}
```

---

## 🔄 Webhook Processing Pattern

Never trust webhook metadata. Always validate:

```typescript
// ✅ Webhook safe pattern
async function processCheckoutCompleted(
  event: Stripe.Event,
): Promise<{ success: boolean; error?: string }> {
  const session = event.data.object as Stripe.Checkout.Session;

  // Step 1: Extract and validate metadata
  const { party_request_id } = session.metadata ?? {};

  if (!party_request_id || typeof party_request_id !== "string") {
    // ⚠️  Log for manual review - this is an anomaly
    console.warn("[webhook] Invalid metadata", {
      eventId: event.id,
      hasMetadata: !!session.metadata,
      metadata: session.metadata,
    });

    // Queue for manual review instead of silently dropping
    await queueForManualReview(event.id, "invalid_metadata");
    
    // Return error so Stripe retries (it will keep failing until manually fixed)
    throw new Error("Invalid webhook metadata - queued for review");
  }

  // Step 2: Validate Stripe fields
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  if (!paymentIntentId) {
    console.warn("[webhook] No payment intent", {
      eventId: event.id,
      sessionId: session.id,
    });
  }

  // Step 3: Update database
  const { error } = await supabaseAdmin
    .from("party_request_payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("party_request_id", party_request_id)
    .single();  // Ensure exactly one row

  if (error) {
    console.error("[webhook] Update failed", {
      party_request_id,
      error: error.message,
    });
    throw error;
  }

  return { success: true };
}
```

---

## ⚡ Race Condition Prevention

### Problem: Check-Then-Act

```typescript
// ❌ UNSAFE - Race condition window exists
const existing = await db.findOne({ id });
if (!existing) {
  await db.create({ id, ...data });  // Another request might insert here!
}
```

### Solutions:

#### Option A: UPSERT (Recommended for payments)
```typescript
// ✅ Atomic in database
const result = await db.upsert(
  { id, ...data },
  { onConflict: "id" }
);
```

#### Option B: Unique Constraint + Try-Catch
```typescript
// In database schema:
// CREATE UNIQUE INDEX idx_party_requests_one_per_user 
//   ON party_requests(party_id, requester_user_id);

try {
  const result = await db.insert({
    party_id,
    requester_user_id,
    ...data,
  });
  return { success: true, data: result };
} catch (error) {
  if (error.code === "23505") {  // unique violation
    // Fetch existing record
    const existing = await db.findOne({ party_id, requester_user_id });
    return { success: true, data: existing };
  }
  throw error;
}
```

#### Option C: Pessimistic Locking
```typescript
// For critical operations, use transaction
const result = await db.transaction(async (trx) => {
  // Lock the row for update
  const existing = await trx
    .from("table")
    .select("*")
    .eq("id", id)
    .forUpdate()  // Locks the row
    .single();

  if (!existing) {
    return await trx.from("table").insert({ id, ...data }).single();
  }

  return existing;
});
```

---

## 📅 Date Handling Patterns

### ❌ Problematic:
```typescript
function toIsoDate(day: number, month: number): string | null {
  const year = now.getMonth() + 1 > month ? now.getFullYear() + 1 : now.getFullYear();
  const candidate = new Date(Date.UTC(year, month - 1, day, 20, 0, 0));
  return candidate.toISOString();
}
```

Problems:
- No bounds checking (31.2. becomes 3.1.)
- Returns past dates
- No clear error indication

### ✅ Better:
```typescript
type DateValidationResult = {
  valid: boolean;
  date?: Date;
  error?: string;
};

function parseEventDate(
  day: string | number,
  month: string | number,
): DateValidationResult {
  // Parse inputs
  const dayNum = typeof day === "string" ? parseInt(day, 10) : day;
  const monthNum = typeof month === "string" ? parseInt(month, 10) : month;

  // Validate ranges
  if (!Number.isInteger(dayNum) || !Number.isInteger(monthNum)) {
    return { valid: false, error: "Day and month must be integers" };
  }

  if (dayNum < 1 || dayNum > 31) {
    return { valid: false, error: `Day must be 1-31, got ${dayNum}` };
  }

  if (monthNum < 1 || monthNum > 12) {
    return { valid: false, error: `Month must be 1-12, got ${monthNum}` };
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();

  // Determine year
  let year = currentYear;
  if (monthNum < currentMonth) {
    year = currentYear + 1;
  } else if (monthNum === currentMonth && dayNum < currentDay) {
    year = currentYear + 1;
  }

  // Create date
  const candidate = new Date(Date.UTC(year, monthNum - 1, dayNum, 20, 0, 0));

  // Validate it's a real date (catches 31.2. etc)
  if (Number.isNaN(candidate.getTime())) {
    return { 
      valid: false, 
      error: `Invalid date: ${dayNum}.${monthNum}.${year}` 
    };
  }

  // Check it's in future
  if (candidate <= now) {
    return {
      valid: false,
      error: `Date ${dayNum}.${monthNum} is in the past`,
    };
  }

  return { valid: true, date: candidate };
}
```

---

## 🛡️ Stripe Integration Checklist

When handling Stripe webhooks:

- [ ] **Signature validation** - Check before processing
- [ ] **Idempotency** - Can process same event twice safely
- [ ] **Metadata validation** - Never assume metadata keys exist
- [ ] **Type casting** - Validate structure after cast
- [ ] **Null handling** - Some Stripe fields can be null
- [ ] **Atomic updates** - Use `.single()` or transactions
- [ ] **Error logging** - Log all failure paths
- [ ] **Retry mechanism** - Return 500 for transient errors
- [ ] **Manual review** - Queue structural failures for human review
- [ ] **Monitoring** - Alert on webhook failures

```typescript
// ✅ Checklist implementation
export async function POST(request: Request) {
  // ✅ Signature validation
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response(null, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      secret,
    );
  } catch (error) {
    return new Response(null, { status: 400 });
  }

  // ✅ Idempotency check
  const log = await getWebhookLog(event.id);
  if (log?.processed_at) {
    return response({ success: true, duplicate: true });
  }

  // ✅ Before processing, ensure log exists
  if (!log) {
    await createWebhookLog(event);
  }

  // ✅ Process with error handling
  try {
    const session = event.data.object as Stripe.Checkout.Session;

    // ✅ Metadata validation
    if (!session.metadata?.party_request_id) {
      await queueForManualReview(event.id);
      throw new Error("Invalid metadata structure");
    }

    // ✅ Atomic update
    await updatePayment(session.metadata.party_request_id, {
      status: "paid",
      payment_intent: session.payment_intent,
    });

    // ✅ Mark processed
    await markProcessed(event.id);
    
    // ✅ Success
    return response({ success: true });
  } catch (error) {
    // ✅ Error handling - mark failed and return 500
    await markFailed(event.id, error);
    
    // ✅ Monitoring
    console.error("[webhook] Error", { eventId: event.id, error });
    
    return new Response(null, { status: 500 });
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests for Scrapers:
```typescript
describe("toIsoDate", () => {
  it("should return null for invalid day", () => {
    expect(toIsoDate(32, 1)).toBeNull();
  });

  it("should return null for invalid month", () => {
    expect(toIsoDate(1, 13)).toBeNull();
  });

  it("should return null for past dates", () => {
    const today = new Date();
    const yesterday = today.getDate() - 1;
    expect(toIsoDate(yesterday, today.getMonth() + 1)).toBeNull();
  });

  it("should return ISO string for valid future date", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const result = toIsoDate(
      tomorrow.getDate(),
      tomorrow.getMonth() + 1,
    );
    
    expect(result).toBeTruthy();
    expect(new Date(result!)).toBeGreaterThan(new Date());
  });
});
```

### Integration Tests for Webhooks:
```typescript
describe("Stripe webhook", () => {
  it("should mark duplicate events as processed", async () => {
    const event = createMockEvent("checkout.session.completed");
    
    // First request
    const res1 = await POST(createRequest(event));
    expect(res1.status).toBe(200);
    
    // Second identical request
    const res2 = await POST(createRequest(event));
    expect(res2.status).toBe(200);
    
    // Both should succeed, but only one actual processing
    const logs = await getWebhookLogs(event.id);
    expect(logs.length).toBe(1);
  });

  it("should return 500 for processing errors", async () => {
    const event = createMockEvent("checkout.session.completed", {
      metadata: {},  // Missing party_request_id
    });
    
    const res = await POST(createRequest(event));
    expect(res.status).toBe(500);
    
    // Should be queued for manual review
    const review = await getManualReview(event.id);
    expect(review).toBeTruthy();
  });
});
```

---

## 📊 Monitoring & Alerts

Setup monitoring for:

```typescript
// 🚨 Critical alerts
1. Webhook processing failures (> 0%)
2. Database constraint violations
3. Missing configuration at startup
4. Payment records with null party_request_id

// ⚠️ Warning alerts
1. Webhook latency > 5 seconds
2. Stripe API failures
3. Regex validation warnings
4. Bring items insertion failures (without party creation)

// 📝 Logging best practices
console.error("[module] Operation failed", {
  userId: user.id,
  operation: "createParty",
  error: error.message,
  timestamp: new Date().toISOString(),
});

// Group logs by module: [module] to enable filtering
```

---

## 🔐 Security Patterns

### Input Validation:
```typescript
// ✅ Always validate string lengths
if (title.length > 120) {
  return { error: "Titel zu lang (max. 120 Zeichen)" };
}

// ✅ Validate numbers
if (!Number.isFinite(amount)) {
  return { error: "Betrag ungültig" };
}

// ✅ Validate dates match server-generated ranges
if (new Date(startsAt) > new Date(endsAt)) {
  return { error: "Enddatum muss nach Startdatum liegen" };
}
```

### Admin Access:
```typescript
// ✅ Check user is party host before allowing edit
const party = await getParty(partyId);
if (party.host_user_id !== user.id) {
  console.warn("[editParty] Unauthorized", { userId: user.id, partyId });
  return { error: "nicht berechtigt" };
}
```

---

## 📚 Reference Links

- [Supabase Error Handling](https://supabase.com/docs)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [TypeScript Error Handling](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

---

## ✅ Code Review Checklist

When reviewing code, check:

- [ ] All database errors are logged
- [ ] All server actions return result type with error?
- [ ] Webhook handlers validate metadata before using
- [ ] Date operations check validity
- [ ] Payment operations use upsert or unique constraints
- [ ] Regex patterns are tested for syntax
- [ ] User input is bounded (length, type, range)
- [ ] Admin operations check authorization
- [ ] Cache is invalidated on success
- [ ] Errors are communicated to users

---

