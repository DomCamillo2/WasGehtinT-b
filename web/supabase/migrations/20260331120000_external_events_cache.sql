-- =========================================================
-- WasGehtTüb - External Events Cache (Off-Vercel Worker)
-- =========================================================

create table if not exists public.external_events_cache (
  id text primary key,
  source text not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  public_lat double precision,
  public_lng double precision,
  external_link text,
  vibe_label text not null,
  location_name text,
  music_genre text,
  scraped_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_events_cache_time_order check (ends_at > starts_at)
);

create index if not exists idx_external_events_cache_starts_at
  on public.external_events_cache (starts_at);

create index if not exists idx_external_events_cache_ends_at
  on public.external_events_cache (ends_at);

create index if not exists idx_external_events_cache_source
  on public.external_events_cache (source);

create or replace function public.set_external_events_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_external_events_cache_updated_at on public.external_events_cache;
create trigger trg_external_events_cache_updated_at
before update on public.external_events_cache
for each row
execute function public.set_external_events_cache_updated_at();

create or replace view public.v_external_events_public as
select
  id,
  title,
  description,
  starts_at,
  ends_at,
  public_lat,
  public_lng,
  external_link,
  vibe_label,
  location_name,
  music_genre,
  true as is_external,
  0::int as max_guests,
  0::int as contribution_cents,
  0::int as spots_left
from public.external_events_cache
where ends_at >= now()
order by starts_at asc;

grant select on public.v_external_events_public to anon;
grant select on public.v_external_events_public to authenticated;
