-- Instagram / scraper dedupe columns for external_events_cache.
-- Safe to re-run: IF NOT EXISTS guards.

alter table public.external_events_cache
  add column if not exists external_id text,
  add column if not exists source_url text;

create index if not exists external_events_cache_external_id_idx
  on public.external_events_cache (external_id)
  where external_id is not null;

create index if not exists external_events_cache_source_external_id_idx
  on public.external_events_cache (source, external_id)
  where external_id is not null;

create index if not exists external_events_cache_source_url_idx
  on public.external_events_cache (source_url)
  where source_url is not null;
