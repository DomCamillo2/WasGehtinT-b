-- =========================================================
-- RLS hardening: authenticated upvotes + admin moderation policies
-- =========================================================

alter table public.event_upvotes enable row level security;

drop policy if exists "event_upvotes_insert_own" on public.event_upvotes;
create policy "event_upvotes_insert_authenticated"
  on public.event_upvotes
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and anonymous_session_id is null
  );

drop policy if exists "event_upvotes_delete_own" on public.event_upvotes;
create policy "event_upvotes_delete_authenticated"
  on public.event_upvotes
  for delete
  to authenticated
  using (
    auth.uid() = user_id
  );

revoke insert, delete on public.event_upvotes from anon;
grant insert, delete on public.event_upvotes to authenticated;

alter table public.content_reports enable row level security;

drop policy if exists "content_reports_admin_read_all" on public.content_reports;
create policy "content_reports_admin_read_all"
  on public.content_reports
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('admin', 'owner')
    )
  );

drop policy if exists "content_reports_admin_update" on public.content_reports;
create policy "content_reports_admin_update"
  on public.content_reports
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('admin', 'owner')
    )
  )
  with check (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('admin', 'owner')
    )
  );

drop policy if exists "content_reports_admin_delete" on public.content_reports;
create policy "content_reports_admin_delete"
  on public.content_reports
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('admin', 'owner')
    )
  );

alter table public.parties enable row level security;

drop policy if exists "parties_admin_delete" on public.parties;
create policy "parties_admin_delete"
  on public.parties
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('admin', 'owner')
    )
  );

alter table public.hangouts enable row level security;

drop policy if exists "hangouts_admin_delete_authenticated" on public.hangouts;
create policy "hangouts_admin_delete_authenticated"
  on public.hangouts
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('admin', 'owner')
    )
  );
