# WasGehtTüb - Systematische Code Review

## Executive Summary
**Status**: ⚠️ Moderate-to-High Priority Issues found  
**Risk Level**: Medium (production-ready with critical fixes needed)  
**Focus Areas**: Error handling, type safety, data validation, webhook processing

---

## 🔴 CRITICAL ISSUES

### 1. **Silent Failures in Server Actions**
**Location**: `src/app/actions/*.ts` (parties, requests, chat, external-events)  
**Severity**: 🔴 CRITICAL  
**Risk**: Data mutations fail silently, users unaware of failures

**Problem**:
```typescript
// src/app/actions/parties.ts
if (error || !party) {
  return;  // ❌ Silently fails - no error message, no logging
}
```

Server actions return `void` but fail conditionally. Errors aren't logged or communicated to users.

**Impact**:
- Party creation fails but UI shows no error
- User thinks their action succeeded but database unchanged
- No audit trail for debugging

**Fix**:
```typescript
// ✅ Option A: Return error state
export async function createPartyAction(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  // ... validation ...
  
  if (error || !party) {
    console.error("Party creation failed:", error);
    return { error: "Party konnte nicht erstellt werden. Bitte versuche es später erneut." };
  }
  
  return { success: true };
}
```

**Files to Update**:
- [src/app/actions/parties.ts](src/app/actions/parties.ts#L50)
- [src/app/actions/requests.ts](src/app/actions/requests.ts#L38)
- [src/app/actions/chat.ts](src/app/actions/chat.ts#L31)

---

### 2. **Unsafe Type Casting in Webhook Processor**
**Location**: [src/lib/stripe-webhook-processor.ts](src/lib/stripe-webhook-processor.ts#L67-L118)  
**Severity**: 🔴 CRITICAL  
**Risk**: Runtime crashes, data corruption

**Problem**:
```typescript
// Casting without validation
const session = event.data.object as Stripe.Checkout.Session;
const requestId = String(session.metadata?.party_request_id ?? "");

// If metadata structure differs, requestId becomes empty string
// Then update runs on WRONG records!
if (requestId) {  // This check is insufficient
  await supabaseAdmin
    .from("party_request_payments")
    .update(updatePayload)
    .eq("party_request_id", requestId);  // Updates nothing if requestId=""
} else {
  // Falls back to session ID - different records might match!
  await supabaseAdmin
    .from("party_request_payments")
    .update(updatePayload)
    .eq("stripe_checkout_session_id", session.id);  // Fallback is unsafe
}
```

**Risk Scenario**:
1. Webhook arrives with malformed metadata
2. `requestId` = ""
3. Falls back to session ID
4. Corrupts wrong payment records

**Fix**:
```typescript
// ✅ Type-safe processing
type CheckoutEvent = {
  event: Stripe.Event;
  sessionId: string;
  requestId?: string;
};

async function processCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Validate metadata structure
  if (!session.metadata?.party_request_id) {
    console.warn("Webhook missing party_request_id meta", { sessionId: session.id });
    // Store for manual review
    await logInvalidWebhookEvent(session.id, "missing_metadata");
    return;
  }

  const { party_request_id } = session.metadata;
  
  await supabaseAdmin
    .from("party_request_payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
    })
    .eq("party_request_id", party_request_id)
    .single();  // Ensure exactly one record
}
```

---

### 3. **Missing Null Check: User Email**
**Location**: [src/app/discover/page.tsx](src/app/discover/page.tsx#L96)  
**Severity**: 🔴 CRITICAL  
**Risk**: Runtime crash on some user types

**Problem**:
```typescript
// User can exist but email be null (OAuth providers, custom auth)
const avatarFallback = (user.email?.[0] ?? "U").toUpperCase();
```

If `user.email` is `null`, `user.email[0]` crashes.

**Fix**:
```typescript
const avatarFallback = (user.email?.[0] ?? "U").toUpperCase();
// Better:
const avatarFallback = String(user.email?.[0] ?? "U").toUpperCase();
```

---

### 4. **Webhook Event Loss on Processing Failure**
**Location**: [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts#L35-L41)  
**Severity**: 🔴 CRITICAL  
**Risk**: Payment webhooks silently fail, users never charged, party hosts get free attendees

**Problem**:
```typescript
try {
  await processStripeEvent(event);
  await markWebhookEventProcessed(event.id);
} catch {
  // ❌ Event marked as failed but never retried!
  await markWebhookEventFailed(event.id, "Webhook-Verarbeitung fehlgeschlagen.");
  return NextResponse.json({ error: "..." }, { status: 500 });
}
```

**Scenario**:
1. User pays successfully
2. Webhook arrives, starts processing
3. Database constraint violation mid-transaction
4. `markWebhookEventFailed()` runs
5. Stripe assumes success (got 500), but payment never recorded
6. User not charged, but request marked paid in UI

**Fix**:
```typescript
// ✅ Structured error retry mechanism
export async function POST(request: Request) {
  // ... signature verification ...

  const existingLog = await getWebhookEventLog(event.id);

  if (existingLog?.processed_at) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!existingLog) {
    await createWebhookEventLog(event);
  }

  let processingError: Error | null = null;
  try {
    await processStripeEvent(event);
  } catch (error) {
    processingError = error instanceof Error ? error : new Error(String(error));
    
    // Log error for manual review
    await markWebhookEventFailed(event.id, processingError.message);
    
    // Return 500 so Stripe retries
    return NextResponse.json(
      { error: "Processing failed", retryable: true },
      { status: 500 }
    );
  }

  try {
    await markWebhookEventProcessed(event.id);
  } catch (error) {
    // Even if marking fails, event was processed
    console.error("Failed to mark webhook processed", { eventId: event.id, error });
  }

  return NextResponse.json({ received: true });
}
```

---

## 🟡 HIGH PRIORITY ISSUES

### 5. **Admin Client Initialization Not Validated**
**Location**: [src/lib/stripe-webhook-processor.ts](src/lib/stripe-webhook-processor.ts#L1-L20)  
**Severity**: 🟡 HIGH  
**Risk**: Undefined behavior if admin credentials missing

**Problem**:
```typescript
function adminClient(): AdminClientLike {
  return getSupabaseAdmin() as unknown as AdminClientLike;  // Double cast hides errors
}

// In getSupabaseAdmin():
if (!url || !serviceRoleKey) {
  throw new Error("...");  // Throws during runtime, not initialization
}
```

If `SUPABASE_SERVICE_ROLE_KEY` missing at runtime:
- Webhook processing throws
- Error caught, marked as failed
- User's payment stuck in limbo

**Fix**:
```typescript
// ✅ Validate at startup (in a separate initialization module)
export function validateAdminClientConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL nicht gesetzt. Webhook-Verarbeitung nicht möglich."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY nicht gesetzt. Webhook-Verarbeitung nicht möglich."
    );
  }
}

// Call in middleware or during app init
// src/app/layout.tsx
import { validateAdminClientConfig } from "@/lib/supabase/admin";

if (process.env.NODE_ENV === "production") {
  validateAdminClientConfig();
}
```

---

### 6. **Payment Race Condition: Duplicate Record Creation**
**Location**: [src/app/actions/payments.ts](src/app/actions/payments.ts#L48-L65)  
**Severity**: 🟡 HIGH  
**Risk**: Multiple payment records for same request, failed webhook retry

**Problem**:
```typescript
const { data: paymentExisting } = await supabase
  .from("party_request_payments")
  .select("id, status")
  .eq("party_request_id", requestId)
  .maybeSingle();

if (!paymentExisting) {
  // ❌ Not atomic! Another request might insert between check and insert
  await supabase.from("party_request_payments").insert({
    party_request_id: requestId,
    // ...
  });
}
```

**Race Scenario**:
1. User clicks "Pay" twice (network latency)
2. Request A checks: no payment exists ✓
3. Request B checks: no payment exists ✓
4. Both insert → 2 payment records created
5. Webhook updates wrong record

**Fix**:
```typescript
// ✅ Use database unique constraint + UPSERT
const { data: payment, error } = await supabase
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
    { onConflict: "party_request_id" }
  )
  .select()
  .single();

if (error || !payment) {
  // ... handle atomically ...
}
```

---

### 7. **External Event Date Parsing: Incomplete Validation**
**Location**: [src/app/actions/external-events.ts](src/app/actions/external-events.ts#L44-L49)  
**Severity**: 🟡 HIGH  
**Risk**: Invalid dates in event list, UI crashes

**Problem**:
```typescript
function toIsoDate(day: number, month: number): string | null {
  const now = new Date();
  const year = now.getMonth() + 1 > month ? now.getFullYear() + 1 : now.getFullYear();
  const candidate = new Date(Date.UTC(year, month - 1, day, 20, 0, 0));
  
  if (Number.isNaN(candidate.getTime())) {
    return null;  // ✓ Checks for invalid date
  }

  return candidate.toISOString();  // But doesn't check if date is in actual future
}
```

**Issue**:
- `toIsoDate(31, 2)` → Invalid date, returns null ✓
- `toIsoDate(31, 1)` → Valid date (Jan 31), but parsing month "2" from "02" might give wrong date
- No check if date has passed

**Fix**:
```typescript
// ✅ Complete validation
function toIsoDate(day: number, month: number): string | null {
  // Validate bounds
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;  // 1-12

  // Determine target year
  let targetYear = currentYear;
  if (month < currentMonth) {
    targetYear = currentYear + 1;
  } else if (month === currentMonth && day < now.getDate()) {
    targetYear = currentYear + 1;
  }

  const candidate = new Date(Date.UTC(targetYear, month - 1, day, 20, 0, 0));

  // Check if date is valid and in future
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }

  if (candidate <= now) {
    return null;  // Don't return past events
  }

  return candidate.toISOString();
}
```

---

### 8. **Regex Error Risk in Event Cancellation Check**
**Location**: [src/app/actions/external-events.ts](src/app/actions/external-events.ts#L23-L33)  
**Severity**: 🟡 HIGH  
**Risk**: Regex errors not caught, events filter incorrectly

**Problem**:
```typescript
const CANCELLED_EVENT_PATTERNS = [
  /\bausfall\b/i,  // German
  /\babgesagt\b/i,
  // ...
];

function isCancelledOrOutageEvent(event: PartyCard): boolean {
  const content = [event.title, event.description, event.vibe_label, event.external_link]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  if (!content) {
    return false;
  }

  return CANCELLED_EVENT_PATTERNS.some((pattern) => pattern.test(content));
}
```

**Risk**: If a regex has invalid syntax at runtime, `.test()` throws and uncaught error crashes the entire scraper.

**Fix**:
```typescript
// ✅ Validate regex at module load time
function validateRegexPatterns(patterns: RegExp[]): void {
  for (const pattern of patterns) {
    try {
      pattern.test("");  // Test pattern
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${pattern.source}`, { cause: error });
    }
  }
}

const CANCELLED_EVENT_PATTERNS = [
  /\bausfall\b/i,
  /\babgesagt\b/i,
  /\bcancelled\b/i,
  /\bcanceled\b/i,
  /\bcancel\b/i,
  /\bfällt\s+aus\b/i,
];

if (process.env.NODE_ENV !== "production" || true) {
  validateRegexPatterns(CANCELLED_EVENT_PATTERNS);
}

// Or wrap test() safely:
function isCancelledOrOutageEvent(event: PartyCard): boolean {
  const content = [event.title, event.description, event.vibe_label, event.external_link]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  if (!content) {
    return false;
  }

  try {
    return CANCELLED_EVENT_PATTERNS.some((pattern) => {
      try {
        return pattern.test(content);
      } catch (error) {
        console.error("Regex error checking event", { pattern: pattern.source, error });
        return false;  // Assume not cancelled if regex fails
      }
    });
  } catch (error) {
    console.error("Error in cancellation check", { error });
    return false;
  }
}
```

---

## 🟠 MEDIUM PRIORITY ISSUES

### 9. **Conditional Cache Revalidation Without Error Propagation**
**Location**: [src/app/actions/parties.ts](src/app/actions/parties.ts#L71-L73)  
**Severity**: 🟠 MEDIUM  
**Risk**: Cache becomes stale if party creation fails

**Problem**:
```typescript
if (bringError) {
  return;  // Returns before revalidatePath
}

revalidatePath("/discover");
revalidatePath("/host");
```

If bring items fail to insert, the action returns but `/discover` cache isn't invalidated for the party.

**Fix**:
```typescript
// ✅ Always revalidate if party was created
if (bringError) {
  console.error("Failed to insert bring items:", bringError);
  revalidatePath("/discover");
  revalidatePath("/host");
  // Optionally return error, or let user know items failed
  return { partialError: "Party erstellt, aber Bring-Items konnten nicht hinzugefügt werden." };
}

revalidatePath("/discover");
revalidatePath("/host");
return { success: true };
```

---

### 10. **Array Filter Without Type Guard**
**Location**: [src/app/discover/page.tsx](src/app/discover/page.tsx#L33-L37)  
**Severity**: 🟠 MEDIUM  
**Risk**: Type safety regression

**Problem**:
```typescript
const hostIds = Array.from(
  new Set(
    safePartyRows
      .map((row) => row.host_user_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  ),
);
```

The type guard is good, but could be more readable.

**Fix**:
```typescript
// ✅ More explicit
const hostIds = Array.from(
  new Set(
    safePartyRows
      .map((row) => row.host_user_id)
      .filter((
        value
      ): value is string => {
        return typeof value === "string" && value.length > 0;
      }),
  ),
);
```

---

## 🔵 LOWER PRIORITY ISSUES

### 11. **Stripe Session Price Data Can Be Null**
**Location**: [src/app/actions/payments.ts](src/app/actions/payments.ts#L148-L159)  
**Severity**: 🔵 LOW  
**Risk**: Edge case type unsafe

The created checkout session might have different structure than expected.

**Fix**: Add optional chaining and defaults:
```typescript
const sessionAmount = typeof session.amount_total === "number" ? session.amount_total : 0;
```

---

### 12. **Missing Logging for Discarded Events**
**Location**: [src/lib/stripe-webhook-processor.ts](src/lib/stripe-webhook-processor.ts#L120-L122)  
**Severity**: 🔵 LOW  
**Risk**: Silent discards of event types

```typescript
default:
  break;  // ❌ Unknown event types silently ignored
```

**Fix**:
```typescript
default:
  console.warn(`Unknown Stripe event type: ${event.type}`);
  // Optionally store in DB for manual review
```

---

## 📋 SUMMARY TABLE

| # | Issue | Location | Severity | Status |
|---|-------|----------|----------|--------|
| 1 | Silent Server Action Failures | `actions/*.ts` | 🔴 CRITICAL | Unfixed |
| 2 | Unsafe Webhook Type Casting | `stripe-webhook-processor.ts` | 🔴 CRITICAL | Unfixed |
| 3 | User Email Null Check | `discover/page.tsx` | 🔴 CRITICAL | Unfixed |
| 4 | Webhook Event Loss | `api/stripe/webhook/route.ts` | 🔴 CRITICAL | Unfixed |
| 5 | Admin Config Not Validated | `supabase/admin.ts` | 🟡 HIGH | Unfixed |
| 6 | Payment Race Condition | `actions/payments.ts` | 🟡 HIGH | Unfixed |
| 7 | Date Parsing Incomplete | `actions/external-events.ts` | 🟡 HIGH | Unfixed |
| 8 | Regex Error Risk | `actions/external-events.ts` | 🟡 HIGH | Unfixed |
| 9 | Cache Revalidation Logic | `actions/parties.ts` | 🟠 MEDIUM | Unfixed |
| 10 | Type Guard Clarity | `discover/page.tsx` | 🟠 MEDIUM | Unfixed |
| 11 | Nullable Stripe Fields | `actions/payments.ts` | 🔵 LOW | Unfixed |
| 12 | Discarded Event Logging | `stripe-webhook-processor.ts` | 🔵 LOW | Unfixed |

---

## 🎯 RECOMMENDED FIX PRIORITY

**Phase 1 (Critical - Deploy ASAP)**:
1. Issue #1: Silent failures (all actions)
2. Issue #2: Webhook type casting
3. Issue #4: Event loss mechanism
4. Issue #3: User email null

**Phase 2 (High - This Sprint)**:
5. Issue #6: Payment race condition
6. Issue #7: Date validation
7. Issue #5: Admin initialization
8. Issue #8: Regex safety

**Phase 3 (Nice to Have)**:
9. Issue #9, #10, #11, #12

---

