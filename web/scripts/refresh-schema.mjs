import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
const ADMIN_KEY = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !ADMIN_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(
  SUPABASE_URL,
  ADMIN_KEY
);

// Try to list tables to force schema cache refresh
async function refreshSchema() {
  console.log('Attempting to refresh Supabase REST schema cache...');
  
  try {
    // Query any table to trigger introspection
    const { data, error } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);
    
    console.log('Schema query result:', { data, error });
    
    // Now try event_upvotes again
    const eventUpvotes = await supabase
      .from('event_upvotes')
      .select('COUNT(*)', { count: 'exact', head: true });
    
    if (eventUpvotes.error) {
      console.error('Still getting error:', eventUpvotes.error);
    } else {
      console.log('✅ event_upvotes table is now accessible! Count:', eventUpvotes.count);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

refreshSchema();
