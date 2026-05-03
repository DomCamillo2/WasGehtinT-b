create table if not exists public.hangouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  title text not null,
  description text not null,
  activity_type text not null check (activity_type in ('sport', 'chill', 'party', 'meetup', 'other')),
  created_at timestamptz not null default now()
);

create index if not exists hangouts_created_at_idx on public.hangouts (created_at desc);
create index if not exists hangouts_activity_type_idx on public.hangouts (activity_type);

alter table public.hangouts enable row level security;

create policy "hangouts_select_authenticated"
on public.hangouts
for select
to authenticated
using (true);

create policy "hangouts_insert_own"
on public.hangouts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "hangouts_update_own"
on public.hangouts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "hangouts_delete_own"
on public.hangouts
for delete
to authenticated
using (auth.uid() = user_id);
