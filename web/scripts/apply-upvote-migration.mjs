import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'db.zntlopkzeklxdfvldugb.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Tuebingen2025!',
  ssl: { rejectUnauthorized: false },
});

const migration = `
CREATE TABLE IF NOT EXISTS public.event_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_upvotes_has_identifier CHECK (user_id IS NOT NULL OR anonymous_session_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_upvotes_unique_user
  ON public.event_upvotes (event_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_upvotes_unique_anon
  ON public.event_upvotes (event_id, anonymous_session_id)
  WHERE anonymous_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_upvotes_event_id
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

async function applyMigration() {
  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('Connected! Applying migration...');
    
    await client.query(migration);
    
    console.log('✅ Migration applied successfully!');
    
    // Verify table exists
    const result = await client.query('SELECT COUNT(*) FROM public.event_upvotes;');
    console.log(`✅ event_upvotes table verified. Current upvote count: ${result.rows[0].count}`);
    
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    await client.end();
    process.exit(1);
  }
}

applyMigration();
