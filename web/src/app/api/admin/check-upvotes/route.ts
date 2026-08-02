import { createClient } from '@supabase/supabase-js';
import { cronSecretMatches } from "@/lib/cron-auth";
import { getSupabaseAdminKey, getSupabaseUrl } from "@/lib/env";

function isAuthorized(request: Request): boolean {
  return cronSecretMatches(request);
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return Response.json({ status: "unauthorized" }, { status: 401 });
    }

    const SUPABASE_URL = getSupabaseUrl();
    const ADMIN_KEY = getSupabaseAdminKey();

    if (!SUPABASE_URL || !ADMIN_KEY) {
      return Response.json(
        {
          status: 'error',
          message: 'Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY',
        },
        { status: 500 },
      );
    }

    const supabase = createClient(SUPABASE_URL, ADMIN_KEY);

    const { error: checkError } = await supabase
      .from('event_upvotes')
      .select('COUNT(*)', { count: 'exact', head: true });

    if (!checkError) {
      return Response.json({
        status: 'ready',
        message: 'event_upvotes table already exists',
        exists: true,
      });
    }

    return Response.json({
      status: 'manual_required',
      message: 'event_upvotes table needs manual creation in Supabase',
      instructions: [
        '1. Open the Supabase SQL editor for this project',
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
