import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zntlopkzeklxdfvldugb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudGxvcGt6ZWtseGRmdmxkdWdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwMzYyNiwiZXhwIjoyMDg5Nzc5NjI2fQ.LSPIBwRYthzOFgvpnzxi3Zqo4k3m0hyNzgSCTORMgjk'
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
