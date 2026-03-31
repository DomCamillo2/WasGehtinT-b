import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zntlopkzeklxdfvldugb.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudGxvcGt6ZWtseGRmdmxkdWdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwMzYyNiwiZXhwIjoyMDg5Nzc5NjI2fQ.LSPIBwRYthzOFgvpnzxi3Zqo4k3m0hyNzgSCTORMgjk';


export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Check if table exists
    console.log('Checking if event_upvotes table exists...');
    const { data: existing, error: checkError } = await supabase
      .from('event_upvotes')
      .select('COUNT(*)', { count: 'exact', head: true });

    if (!checkError) {
      return Response.json({
        status: 'ready',
        message: 'event_upvotes table already exists',
        exists: true,
      });
    }

    // If it doesn't exist, return instructions
    return Response.json({
      status: 'manual_required',
      message: 'event_upvotes table needs manual creation in Supabase',
      instructions: [
        '1. Go to https://app.supabase.com/project/zntlopkzeklxdfvldugb/sql/new',
        '2. Copy and run the migration SQL from web/supabase/migrations/20260331170000_event_upvotes_all_events.sql',
        '3. After SQL runs, upvote system will be fully operational',
      ],
      exists: false,
    });
  } catch (err) {
    return Response.json({
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
