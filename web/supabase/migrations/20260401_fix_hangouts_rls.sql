-- =========================================================
-- FIX: Drop ALL existing policies and recreate clean on hangouts
-- =========================================================

-- Drop ALL policies on hangouts (including any old ones)
do $$
declare
  r RECORD;
begin
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hangouts'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.hangouts', r.policyname);
  END LOOP;
end$$;

-- Enable RLS
alter table public.hangouts enable row level security;

-- Create ONLY the policies we need

-- 1. PUBLIC can read ONLY approved/published hangouts
create policy "hangouts_select_approved"
on public.hangouts
for select
to anon, authenticated
using (
  review_status = 'approved'
  and status = 'published'
  and is_published = true
);

-- 2. ANON + AUTHENTICATED can INSERT pending hangouts (anonymous submissions)
create policy "hangouts_insert_pending"
on public.hangouts
for insert
to anon, authenticated
with check (
  review_status = 'pending'
  and status = 'pending'
  and is_published = false
);

-- 3. AUTHENTICATED users can UPDATE their own entries
create policy "hangouts_update_own"
on public.hangouts
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

-- 4. Allow admin (SERVICE ROLE) to do everything
create policy "hangouts_admin_all"
on public.hangouts
for all
to service_role
using (true)
with check (true);
