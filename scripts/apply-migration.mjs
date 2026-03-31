import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zntlopkzeklxdfvldugb.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudGxvcGt6ZWtseGRmdmxkdWdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwMzYyNiwiZXhwIjoyMDg5Nzc5NjI2fQ.LSPIBwRYthzOFgvpnzxi3Zqo4k3m0hyNzgSCTORMgjk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const migration = `
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
`;

async function applyMigration() {
  try {
    console.log('Executing migration...');
    const { error } = await supabase.rpc('exec_sql', { sql: migration });
    
    if (error) {
      console.error('Migration error:', error);
      process.exit(1);
    }
    
    console.log('Migration executed successfully');
    
    // Verify table exists
    const { data, error: verifyError } = await supabase
      .from('event_upvotes')
      .select('count(*)', { count: 'exact', head: true });
    
    if (verifyError) {
      console.error('Verification error:', verifyError);
      process.exit(1);
    }
    
    console.log('✅ event_upvotes table verified and ready');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

applyMigration();
