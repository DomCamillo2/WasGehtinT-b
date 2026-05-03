create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.user_profiles (id) on delete cascade,
  target_type text not null check (target_type in ('chat', 'spontan', 'party', 'other')),
  target_id text not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.user_profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_reports_created_at_idx on public.content_reports (created_at desc);
create index if not exists content_reports_status_idx on public.content_reports (status);
create index if not exists content_reports_target_idx on public.content_reports (target_type, target_id);

alter table public.content_reports enable row level security;

create policy "content_reports_insert_own"
on public.content_reports
for insert
to authenticated
with check (auth.uid() = reporter_user_id);

create policy "content_reports_select_own"
on public.content_reports
for select
to authenticated
using (auth.uid() = reporter_user_id);
