-- =========================================================
-- WasGehtTüb – Stripe Webhook Idempotency
-- =========================================================

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stripe_webhook_events_created_at
  on public.stripe_webhook_events (created_at desc);

alter table public.stripe_webhook_events enable row level security;

-- Kein direkter Client-Zugriff; Service Role verarbeitet Webhooks.
