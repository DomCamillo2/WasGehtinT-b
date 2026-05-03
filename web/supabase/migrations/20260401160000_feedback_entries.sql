create table if not exists public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  contact_email text,
  type text not null default 'feedback',
  title text not null,
  message text not null,
  status text not null default 'open',
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_entries_type_check check (type in ('feedback', 'feature_request')),
  constraint feedback_entries_status_check check (status in ('open', 'reviewing', 'planned', 'closed'))
);

create index if not exists idx_feedback_entries_status_created_at
  on public.feedback_entries (status, created_at desc);

create index if not exists idx_feedback_entries_created_at
  on public.feedback_entries (created_at desc);

alter table public.feedback_entries enable row level security;

drop policy if exists "feedback_entries_insert_public" on public.feedback_entries;
create policy "feedback_entries_insert_public"
on public.feedback_entries
for insert
to anon, authenticated
with check (
  type in ('feedback', 'feature_request')
  and status = 'open'
);

drop policy if exists "feedback_entries_select_own" on public.feedback_entries;
create policy "feedback_entries_select_own"
on public.feedback_entries
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "feedback_entries_update_own" on public.feedback_entries;
create policy "feedback_entries_update_own"
on public.feedback_entries
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.set_feedback_entries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_feedback_entries_updated_at on public.feedback_entries;
create trigger trg_feedback_entries_updated_at
before update on public.feedback_entries
for each row
execute function public.set_feedback_entries_updated_at();
