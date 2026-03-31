-- Generic event upvotes for both internal and external discover items.
create table if not exists public.event_upvotes (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_session_id text,
  created_at timestamptz not null default now(),
  constraint event_upvotes_has_identifier check (user_id is not null or anonymous_session_id is not null)
);

create unique index if not exists idx_event_upvotes_unique_user
  on public.event_upvotes (event_id, user_id)
  where user_id is not null;

create unique index if not exists idx_event_upvotes_unique_anon
  on public.event_upvotes (event_id, anonymous_session_id)
  where anonymous_session_id is not null;

create index if not exists idx_event_upvotes_event_id
  on public.event_upvotes (event_id);

alter table public.event_upvotes enable row level security;

drop policy if exists "event_upvotes_select_public" on public.event_upvotes;
create policy "event_upvotes_select_public"
  on public.event_upvotes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "event_upvotes_insert_own" on public.event_upvotes;
create policy "event_upvotes_insert_own"
  on public.event_upvotes
  for insert
  to anon, authenticated
  with check (
    (auth.uid() = user_id)
    or (auth.uid() is null and user_id is null and anonymous_session_id is not null)
  );

drop policy if exists "event_upvotes_delete_own" on public.event_upvotes;
create policy "event_upvotes_delete_own"
  on public.event_upvotes
  for delete
  to anon, authenticated
  using (
    (auth.uid() = user_id)
    or (auth.uid() is null and user_id is null and anonymous_session_id is not null)
  );

grant select, insert, delete on public.event_upvotes to anon;
grant select, insert, delete on public.event_upvotes to authenticated;
