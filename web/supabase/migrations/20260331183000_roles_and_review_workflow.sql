alter table public.user_profiles
  add column if not exists role text not null default 'student';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_role_check'
      and conrelid = 'public.user_profiles'::regclass
  ) then
    alter table public.user_profiles
      add constraint user_profiles_role_check
      check (role in ('student', 'owner', 'admin'));
  end if;
end $$;

alter table public.parties
  add column if not exists review_status text not null default 'approved';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'parties_review_status_check'
      and conrelid = 'public.parties'::regclass
  ) then
    alter table public.parties
      add constraint parties_review_status_check
      check (review_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists idx_parties_review_status_starts_at
  on public.parties (review_status, starts_at);