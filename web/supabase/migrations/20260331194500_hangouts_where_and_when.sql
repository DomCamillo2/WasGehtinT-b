-- =========================================================
-- WasGehtTueb - Hangouts: separate where/when fields
-- =========================================================

alter table public.hangouts
  add column if not exists location_text text,
  add column if not exists meetup_at timestamptz;

create index if not exists idx_hangouts_meetup_at
  on public.hangouts (meetup_at desc);

create index if not exists idx_hangouts_location_text
  on public.hangouts (location_text);
