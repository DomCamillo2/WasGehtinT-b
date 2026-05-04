-- Extended columns for external_events_cache + public read view
-- (ingest metadata, categorization; keeps instagram/cron path on base columns)

alter table public.external_events_cache
  add column if not exists category_slug text,
  add column if not exists category_label text,
  add column if not exists event_scope text,
  add column if not exists is_all_day boolean not null default false,
  add column if not exists audience_label text,
  add column if not exists price_info text;

create or replace view public.v_external_events_public as
select
  id,
  source,
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
  category_slug,
  category_label,
  event_scope,
  is_all_day,
  audience_label,
  price_info,
  true as is_external,
  0::int as max_guests,
  0::int as contribution_cents,
  0::int as spots_left
from public.external_events_cache
where ends_at >= now();

grant select on public.v_external_events_public to anon;
grant select on public.v_external_events_public to authenticated;
