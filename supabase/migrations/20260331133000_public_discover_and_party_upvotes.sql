-- =========================================================
-- WasGehtTueb - Public Discover + Party Upvotes
-- =========================================================

-- Discover feed can be read without login through the curated public view.
grant select on public.v_public_parties to anon;
grant select on public.v_public_parties to authenticated;

-- Safety belt: anonymous users may read parties via view, but cannot mutate parties.
revoke insert, update, delete on public.parties from anon;

create table if not exists public.party_upvotes (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_session_id text,
  created_at timestamptz not null default now(),
  constraint party_upvotes_unique_party_user_or_anon unique (party_id, coalesce(user_id, '')), 
  constraint party_upvotes_unique_party_anon unique (party_id, anonymous_session_id),
  constraint party_upvotes_has_identifier check (user_id is not null or anonymous_session_id is not null)
);

create index if not exists idx_party_upvotes_party_id
  on public.party_upvotes (party_id);

create index if not exists idx_party_upvotes_user_id
  on public.party_upvotes (user_id);

alter table public.party_upvotes enable row level security;

drop policy if exists "party_upvotes_select_public" on public.party_upvotes;
create policy "party_upvotes_select_public"
  on public.party_upvotes
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.parties p
      where p.id = party_id
        and p.status = 'published'
    )
  );

drop policy if exists "party_upvotes_insert_own" on public.party_upvotes;
create policy "party_upvotes_insert_own"
  on public.party_upvotes
  for insert
  to authenticated, anon
  with check (
    (auth.uid() = user_id or anonymous_session_id is not null)
    and exists (
      select 1
      from public.parties p
      where p.id = party_id
        and p.status = 'published'
    )
  );

drop policy if exists "party_upvotes_delete_own" on public.party_upvotes;
create policy "party_upvotes_delete_own"
  on public.party_upvotes
  for delete
  to authenticated, anon
  using (auth.uid() = user_id or anonymous_session_id is not null);

grant select on public.party_upvotes to anon;
grant select, insert, delete on public.party_upvotes to anon;
grant select, insert, delete on public.party_upvotes to authenticated;
