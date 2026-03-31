const SUPABASE_URL = 'https://zntlopkzeklxdfvldugb.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudGxvcGt6ZWtseGRmdmxkdWdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwMzYyNiwiZXhwIjoyMDg5Nzc5NjI2fQ.LSPIBwRYthzOFgvpnzxi3Zqo4k3m0hyNzgSCTORMgjk';

// Use functions API to execute SQL
async function executeSql(sql) {
  const headers = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  // Try using the SQL endpoint if available
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql }),
  });

  return { status: response.status, text: await response.text() };
}

async function setupUpvotes() {
  console.log('Setting up event_upvotes table...\n');

  // Create the table through REST API  
  const sql = `
    DROP TABLE IF EXISTS public.event_upvotes CASCADE;

    CREATE TABLE public.event_upvotes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id text NOT NULL,
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      anonymous_session_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT event_upvotes_has_identifier CHECK (user_id IS NOT NULL OR anonymous_session_id IS NOT NULL)
    );

    CREATE UNIQUE INDEX idx_event_upvotes_unique_user
      ON public.event_upvotes (event_id, user_id)
      WHERE user_id IS NOT NULL;

    CREATE UNIQUE INDEX idx_event_upvotes_unique_anon
      ON public.event_upvotes (event_id, anonymous_session_id)
      WHERE anonymous_session_id IS NOT NULL;

    CREATE INDEX idx_event_upvotes_event_id
      ON public.event_upvotes (event_id);

    ALTER TABLE public.event_upvotes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "event_upvotes_select_public" ON public.event_upvotes;
    CREATE POLICY "event_upvotes_select_public"
      ON public.event_upvotes
      FOR SELECT
      TO anon, authenticated
      USING (true);

    DROP POLICY IF EXISTS "event_upvotes_insert_own" ON public.event_upvotes;
    CREATE POLICY "event_upvotes_insert_own"
      ON public.event_upvotes
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        (auth.uid() = user_id)
        OR (auth.uid() IS NULL AND user_id IS NULL AND anonymous_session_id IS NOT NULL)
      );

    DROP POLICY IF EXISTS "event_upvotes_delete_own" ON public.event_upvotes;
    CREATE POLICY "event_upvotes_delete_own"
      ON public.event_upvotes
      FOR DELETE
      TO anon, authenticated
      USING (
        (auth.uid() = user_id)
        OR (auth.uid() IS NULL AND user_id IS NULL AND anonymous_session_id IS NOT NULL)
      );

    GRANT SELECT, INSERT, DELETE ON public.event_upvotes TO anon;
    GRANT SELECT, INSERT, DELETE ON public.event_upvotes TO authenticated;
  `;

  try {
    const result = await executeSql(sql);
    console.log(`SQL execution status: ${result.status}`);
    console.log(`Response: ${result.text}\n`);
    
    if (result.status === 200 || result.status === 204) {
      console.log('✅ Migration appears successful');
    } else {
      console.log('⚠️  Unexpected status, but continuing...');
    }
  } catch (err) {
    console.error('Error executing SQL:', err.message);
  }
}

setupUpvotes();
