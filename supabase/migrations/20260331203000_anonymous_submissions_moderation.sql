-- =========================================================
-- Anonymous submissions + moderation-first workflow
-- =========================================================

-- Parties: allow anonymous submissions and keep submitter display name.
alter table public.parties
  add column if not exists submitter_name text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'parties'
      and column_name = 'host_user_id'
      and is_nullable = 'NO'
  ) then
    execute 'alter table public.parties alter column host_user_id drop not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'parties'
      and column_name = 'host_id'
      and is_nullable = 'NO'
  ) then
    execute 'alter table public.parties alter column host_id drop not null';
  end if;
end $$;

update public.parties
set review_status = 'approved'
where review_status is null;

-- Hangouts: moderation workflow and anonymous submissions.
alter table public.hangouts
  add column if not exists submitter_name text,
  add column if not exists review_status text not null default 'pending',
  add column if not exists status text not null default 'pending',
  add column if not exists is_published boolean not null default false;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'hangouts'
      and column_name = 'user_id'
      and is_nullable = 'NO'
  ) then
    execute 'alter table public.hangouts alter column user_id drop not null';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'hangouts_review_status_check'
      and conrelid = 'public.hangouts'::regclass
  ) then
    alter table public.hangouts
      add constraint hangouts_review_status_check
      check (review_status in ('pending', 'approved', 'rejected'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'hangouts_status_check'
      and conrelid = 'public.hangouts'::regclass
  ) then
    alter table public.hangouts
      add constraint hangouts_status_check
      check (status in ('pending', 'published', 'rejected'));
  end if;
end $$;

update public.hangouts
set
  review_status = 'approved',
  status = 'published',
  is_published = true
where review_status is distinct from 'approved'
  and status is distinct from 'published'
  and coalesce(is_published, false) = false;

create index if not exists idx_hangouts_review_status_created_at
  on public.hangouts (review_status, created_at);

-- Public can only read approved/published hangouts.
drop policy if exists "hangouts_select_authenticated" on public.hangouts;
drop policy if exists "hangouts_select_public_approved" on public.hangouts;
create policy "hangouts_select_public_approved"
on public.hangouts
for select
to anon, authenticated
using (
  review_status = 'approved'
  or status = 'published'
  or is_published = true
);
