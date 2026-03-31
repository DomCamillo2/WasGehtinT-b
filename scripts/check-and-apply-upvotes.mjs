import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zntlopkzeklxdfvldugb.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudGxvcGt6ZWtseGRmdmxkdWdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwMzYyNiwiZXhwIjoyMDg5Nzc5NjI2fQ.LSPIBwRYthzOFgvpnzxi3Zqo4k3m0hyNzgSCTORMgjk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: {
    schema: 'public',
  },
});

// Migration SQL split into smaller statements
const statements = [
  `CREATE TABLE IF NOT EXISTS public.event_upvotes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    anonymous_session_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT event_upvotes_has_identifier CHECK (user_id IS NOT NULL OR anonymous_session_id IS NOT NULL)
  );`,
  
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_event_upvotes_unique_user
    ON public.event_upvotes (event_id, user_id)
    WHERE user_id IS NOT NULL;`,
  
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_event_upvotes_unique_anon
    ON public.event_upvotes (event_id, anonymous_session_id)
    WHERE anonymous_session_id IS NOT NULL;`,
  
  `CREATE INDEX IF NOT EXISTS idx_event_upvotes_event_id
    ON public.event_upvotes (event_id);`,
  
  `ALTER TABLE public.event_upvotes ENABLE ROW LEVEL SECURITY;`,
  
  `DROP POLICY IF EXISTS "event_upvotes_select_public" ON public.event_upvotes;`,
  
  `CREATE POLICY "event_upvotes_select_public"
    ON public.event_upvotes
    FOR SELECT
    TO anon, authenticated
    USING (true);`,
  
  `DROP POLICY IF EXISTS "event_upvotes_insert_own" ON public.event_upvotes;`,
  
  `CREATE POLICY "event_upvotes_insert_own"
    ON public.event_upvotes
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
      (auth.uid() = user_id)
      OR (auth.uid() IS NULL AND user_id IS NULL AND anonymous_session_id IS NOT NULL)
    );`,
  
  `DROP POLICY IF EXISTS "event_upvotes_delete_own" ON public.event_upvotes;`,
  
  `CREATE POLICY "event_upvotes_delete_own"
    ON public.event_upvotes
    FOR DELETE
    TO anon, authenticated
    USING (
      (auth.uid() = user_id)
      OR (auth.uid() IS NULL AND user_id IS NULL AND anonymous_session_id IS NOT NULL)
    );`,
  
  `GRANT SELECT, INSERT, DELETE ON public.event_upvotes TO anon;`,
  `GRANT SELECT, INSERT, DELETE ON public.event_upvotes TO authenticated;`,
];

async function applyMigration() {
  try {
    console.log('Checking if event_upvotes table exists...');
    
    const { data, error } = await supabase
      .from('event_upvotes')
      .select('COUNT(*)', { count: 'exact', head: true });
    
    if (!error) {
      console.log('✅ event_upvotes table already exists!');
      process.exit(0);
    }
    
    console.log('Table does not exist. Creating via SQL statements...');
    
    // Try to execute raw SQL through a function if available, or report the need for manual execution
    console.log(`\n⚠️  To create the event_upvotes table, please execute this SQL in Supabase SQL Editor:\n`);
    console.log(`${statements.join('\n')}`);
    console.log(`\nAfter executing the above SQL, the upvote system will be fully operational.`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

applyMigration();
