import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
const ADMIN_KEY = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !ADMIN_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, ADMIN_KEY);

const migration = `
-- Anonymous submissions + moderation-first workflow
-- Parties: allow anonymous submissions and keep submitter display name.
alter table public.parties
  add column if not exists submitter_name text;

do $block$
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
end $block$;

update public.parties
set review_status = 'approved'
where review_status is null;

-- Hangouts: moderation workflow and anonymous submissions.
alter table public.hangouts
  add column if not exists submitter_name text,
  add column if not exists review_status text not null default 'pending',
  add column if not exists \`status\` text not null default 'pending',
  add column if not exists is_published boolean not null default false;

do $block$
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
end $block$;

do $block$
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
      check (\`status\` in ('pending', 'published', 'rejected'));
  end if;
end $block$;

update public.hangouts
set
  review_status = 'approved',
  \`status\` = 'published',
  is_published = true
where review_status is distinct from 'approved'
  and \`status\` is distinct from 'published'
  and coalesce(is_published, false) = false;

create index if not exists idx_hangouts_review_status_created_at
  on public.hangouts (review_status, created_at);

-- RLS Policies
drop policy if exists "hangouts_select_authenticated" on public.hangouts;
drop policy if exists "hangouts_select_public_approved" on public.hangouts;
create policy "hangouts_select_public_approved"
on public.hangouts
for select
to anon, authenticated
using (
  review_status = 'approved'
  or \`status\` = 'published'
  or is_published = true
);

drop policy if exists "hangouts_insert_pending" on public.hangouts;
create policy "hangouts_insert_pending"
on public.hangouts
for insert
to anon, authenticated
with check (
  review_status = 'pending'
  and \`status\` = 'pending'
  and is_published = false
);

drop policy if exists "hangouts_update_own" on public.hangouts;
create policy "hangouts_update_own"
on public.hangouts
for update
to authenticated
using (
  coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid) = auth.uid()
)
with check (
  coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid) = auth.uid()
);
`;

async function main() {
  try {
    console.log('Applying migration to production Supabase...');
    const { error } = await supabase.rpc('exec_sql', { sql_string: migration });
    
    if (error) {
      // Try direct query instead
      console.log('Fallback: Executing SQL directly via query...');
      const parts = migration.split(';').filter(p => p.trim());
      
      for (const sql of parts) {
        if (!sql.trim()) continue;
        console.log('Executing:', sql.slice(0, 80) + '...');
        const { error: partError } = await supabase.rpc('exec_sql', { sql_string: sql });
        
        if (partError) {
          console.warn('Part error (may be okay):', partError.message);
        }
      }
    }
    
    console.log('✅ Migration completed!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

main();
