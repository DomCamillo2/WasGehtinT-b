import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const ADMIN_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return Response.json({ status: "unauthorized" }, { status: 401 });
    }

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
