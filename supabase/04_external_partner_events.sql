-- =========================================================
-- WasGehtTüb – Partner-Events (External)
-- =========================================================

alter table public.parties
  add column if not exists is_external boolean not null default false,
  add column if not exists external_link text;

create or replace view public.v_public_parties as
select
  p.id,
  p.title,
  p.description,
  p.starts_at,
  p.ends_at,
  p.max_guests,
  p.contribution_cents,
  p.public_lat,
  p.public_lng,
  p.is_external,
  p.external_link,
  p.status,
  v.slug as vibe_slug,
  v.label as vibe_label,
  coalesce(acc.accepted_people, 0) as accepted_people,
  greatest(p.max_guests - coalesce(acc.accepted_people, 0), 0) as spots_left,
  p.created_at
from public.parties p
join public.party_vibes v on v.id = p.vibe_id
left join (
  select
    party_id,
    sum(group_size)::int as accepted_people
  from public.party_requests
  where status = 'accepted'
  group by party_id
) acc on acc.party_id = p.id
where p.status = 'published';