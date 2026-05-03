-- =========================================================
-- WasGehtTüb – Seed + Views (MVP)
-- Voraussetzung: Schema aus 01_schema.sql ist bereits ausgeführt
-- =========================================================

-- ---------------------------------------------------------
-- 1) Basis-Seed für Vibes (idempotent)
-- ---------------------------------------------------------
insert into public.party_vibes (slug, label)
values
  ('beerpong', 'Beerpong'),
  ('vorgluehen', 'Vorglühen'),
  ('hausparty', 'Hausparty'),
  ('chillig', 'Chillig')
on conflict do nothing;

-- ---------------------------------------------------------
-- 2) Demo-Daten (nur falls mindestens 2 User vorhanden)
-- ---------------------------------------------------------
do $$
declare
  v_host uuid;
  v_guest uuid;
  v_vibe_id smallint;
begin
  select id into v_host
  from public.user_profiles
  order by created_at asc
  limit 1;

  select id into v_guest
  from public.user_profiles
  where id <> v_host
  order by created_at asc
  limit 1;

  if v_host is null or v_guest is null then
    raise notice 'Seed übersprungen: Es werden mindestens 2 Einträge in public.user_profiles benötigt.';
    return;
  end if;

  select id into v_vibe_id
  from public.party_vibes
  where slug = 'hausparty'
  limit 1;

  if v_vibe_id is null then
    raise notice 'Seed übersprungen: party_vibes nicht verfügbar.';
    return;
  end if;

  -- Demo-Party (feste IDs für idempotentes Re-Run)
  insert into public.parties (
    id,
    host_user_id,
    vibe_id,
    title,
    description,
    starts_at,
    ends_at,
    application_deadline,
    max_guests,
    status,
    contribution_cents,
    public_lat,
    public_lng,
    public_point
  ) values (
    '11111111-1111-1111-1111-111111111111',
    v_host,
    v_vibe_id,
    'Demo WG Freitag',
    'Gemütliche Hausparty mit Musik und Küchentalk.',
    now() + interval '2 days',
    now() + interval '2 days 6 hours',
    now() + interval '1 day 20 hours',
    20,
    'published',
    500,
    48.521600,
    9.057600,
    st_setsrid(st_makepoint(9.057600, 48.521600), 4326)::geography
  )
  on conflict (id) do update
  set
    host_user_id = excluded.host_user_id,
    vibe_id = excluded.vibe_id,
    title = excluded.title,
    description = excluded.description,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    application_deadline = excluded.application_deadline,
    max_guests = excluded.max_guests,
    status = excluded.status,
    contribution_cents = excluded.contribution_cents,
    public_lat = excluded.public_lat,
    public_lng = excluded.public_lng,
    public_point = excluded.public_point,
    updated_at = now();

  -- Exakte Adresse (nur für accepted Gäste sichtbar durch RLS)
  insert into public.party_locations (
    party_id,
    street,
    house_number,
    postal_code,
    city,
    address_note,
    exact_lat,
    exact_lng
  ) values (
    '11111111-1111-1111-1111-111111111111',
    'Musterstraße',
    '12',
    '72070',
    'Tübingen',
    'Klingelname: WG Freitag',
    48.522100,
    9.058200
  )
  on conflict (party_id) do update
  set
    street = excluded.street,
    house_number = excluded.house_number,
    postal_code = excluded.postal_code,
    city = excluded.city,
    address_note = excluded.address_note,
    exact_lat = excluded.exact_lat,
    exact_lng = excluded.exact_lng,
    updated_at = now();

  insert into public.bring_items (id, party_id, item_name, quantity_needed, sort_order, is_active)
  values
    ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Eiswürfel', 3, 1, true),
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Pappbecher', 2, 2, true)
  on conflict (id) do update
  set
    item_name = excluded.item_name,
    quantity_needed = excluded.quantity_needed,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

  -- Gruppenanfrage (accepted)
  insert into public.party_requests (
    id,
    party_id,
    requester_user_id,
    group_size,
    message,
    status,
    decided_at,
    decided_by
  ) values (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    v_guest,
    3,
    'Wir wären zu dritt und bringen gute Laune mit.',
    'accepted',
    now() - interval '2 hours',
    v_host
  )
  on conflict (id) do update
  set
    party_id = excluded.party_id,
    requester_user_id = excluded.requester_user_id,
    group_size = excluded.group_size,
    message = excluded.message,
    status = excluded.status,
    decided_at = excluded.decided_at,
    decided_by = excluded.decided_by,
    updated_at = now();

  insert into public.party_request_bring_items (
    id,
    party_request_id,
    bring_item_id,
    quantity_committed
  ) values
    ('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222221', 1),
    ('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 1)
  on conflict (id) do update
  set
    party_request_id = excluded.party_request_id,
    bring_item_id = excluded.bring_item_id,
    quantity_committed = excluded.quantity_committed;

  insert into public.party_request_payments (
    id,
    party_request_id,
    currency,
    contribution_per_person_cents,
    service_fee_cents,
    group_size,
    total_contribution_cents,
    total_cents,
    status,
    paid_at
  ) values (
    '55555555-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333333',
    'EUR',
    500,
    50,
    3,
    1500,
    1550,
    'paid',
    now() - interval '90 minutes'
  )
  on conflict (id) do update
  set
    party_request_id = excluded.party_request_id,
    contribution_per_person_cents = excluded.contribution_per_person_cents,
    service_fee_cents = excluded.service_fee_cents,
    group_size = excluded.group_size,
    total_contribution_cents = excluded.total_contribution_cents,
    total_cents = excluded.total_cents,
    status = excluded.status,
    paid_at = excluded.paid_at,
    updated_at = now();

  -- Mini-Chat (simpel: nur Text)
  insert into public.chat_threads (
    id,
    party_request_id,
    party_id,
    host_user_id,
    guest_user_id
  ) values (
    '66666666-6666-6666-6666-666666666666',
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    v_host,
    v_guest
  )
  on conflict (party_request_id) do update
  set
    party_id = excluded.party_id,
    host_user_id = excluded.host_user_id,
    guest_user_id = excluded.guest_user_id;

  insert into public.chat_messages (id, thread_id, sender_user_id, body)
  values
    ('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666666', v_guest, 'Hi! Welcher Klingelname?'),
    ('77777777-7777-7777-7777-777777777772', '66666666-6666-6666-6666-666666666666', v_host, 'Klingelname ist WG Freitag :)')
  on conflict (id) do update
  set
    body = excluded.body;
end $$;

-- ---------------------------------------------------------
-- 3) Views für App-Screens
-- ---------------------------------------------------------

-- 3.1 Öffentliche Map-/Listen-Daten (ohne exakte Adresse)
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

-- 3.2 Mitbring-Status pro Party
create or replace view public.v_party_bring_progress as
select
  bi.party_id,
  bi.id as bring_item_id,
  bi.item_name,
  bi.quantity_needed,
  coalesce(sum(prbi.quantity_committed), 0)::int as quantity_committed,
  greatest(bi.quantity_needed - coalesce(sum(prbi.quantity_committed), 0), 0)::int as quantity_open
from public.bring_items bi
left join public.party_request_bring_items prbi on prbi.bring_item_id = bi.id
where bi.is_active = true
group by bi.party_id, bi.id, bi.item_name, bi.quantity_needed;

-- 3.3 Host-Dashboard (eigene Partys + Kennzahlen)
create or replace view public.v_host_party_dashboard as
select
  p.id as party_id,
  p.host_user_id,
  p.title,
  p.starts_at,
  p.status as party_status,
  p.max_guests,
  coalesce(stats.pending_requests, 0) as pending_requests,
  coalesce(stats.accepted_requests, 0) as accepted_requests,
  coalesce(stats.accepted_people, 0) as accepted_people,
  greatest(p.max_guests - coalesce(stats.accepted_people, 0), 0) as spots_left,
  coalesce(pay.paid_total_cents, 0) as paid_total_cents,
  coalesce(pay.paid_service_fee_cents, 0) as paid_service_fee_cents
from public.parties p
left join (
  select
    pr.party_id,
    count(*) filter (where pr.status = 'pending')::int as pending_requests,
    count(*) filter (where pr.status = 'accepted')::int as accepted_requests,
    coalesce(sum(pr.group_size) filter (where pr.status = 'accepted'), 0)::int as accepted_people
  from public.party_requests pr
  group by pr.party_id
) stats on stats.party_id = p.id
left join (
  select
    pr.party_id,
    coalesce(sum(pp.total_contribution_cents) filter (where pp.status = 'paid'), 0)::int as paid_total_cents,
    coalesce(sum(pp.service_fee_cents) filter (where pp.status = 'paid'), 0)::int as paid_service_fee_cents
  from public.party_request_payments pp
  join public.party_requests pr on pr.id = pp.party_request_id
  group by pr.party_id
) pay on pay.party_id = p.id;

-- 3.4 Meine Anfragen (Gast-Sicht)
create or replace view public.v_my_requests as
select
  pr.id as party_request_id,
  pr.requester_user_id,
  pr.party_id,
  p.title as party_title,
  p.starts_at,
  p.status as party_status,
  pr.group_size,
  pr.status as request_status,
  pr.created_at as requested_at,
  pr.decided_at,
  host.id as host_user_id,
  host.display_name as host_display_name,
  coalesce(pp.status, 'requires_payment'::payment_status) as payment_status,
  pp.total_cents,
  pp.service_fee_cents
from public.party_requests pr
join public.parties p on p.id = pr.party_id
join public.user_profiles host on host.id = p.host_user_id
left join public.party_request_payments pp on pp.party_request_id = pr.id;

-- 3.5 Chat-Übersicht (letzte Nachricht pro Thread)
create or replace view public.v_chat_threads_with_last_message as
select
  t.id as thread_id,
  t.party_id,
  t.party_request_id,
  t.host_user_id,
  t.guest_user_id,
  lm.last_message_at,
  m.sender_user_id as last_sender_user_id,
  m.body as last_message_body
from public.chat_threads t
left join (
  select thread_id, max(created_at) as last_message_at
  from public.chat_messages
  group by thread_id
) lm on lm.thread_id = t.id
left join public.chat_messages m
  on m.thread_id = lm.thread_id
 and m.created_at = lm.last_message_at;

-- ---------------------------------------------------------
-- 4) Grants auf Views
-- ---------------------------------------------------------
grant select on public.v_public_parties to authenticated;
grant select on public.v_party_bring_progress to authenticated;
grant select on public.v_host_party_dashboard to authenticated;
grant select on public.v_my_requests to authenticated;
grant select on public.v_chat_threads_with_last_message to authenticated;
