import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ partyId: string }>;
};

type UpvoteRequestBody = {
  upvoted?: boolean;
};

async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("anon_session_id")?.value;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  // Keep the anonymous vote session readable on all routes (e.g. /discover and /api).
  cookieStore.set("anon_session_id", sessionId, {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return sessionId;
}

async function getDesiredVoteState(request: Request): Promise<boolean | null> {
  try {
    const body = (await request.json()) as UpvoteRequestBody;
    return typeof body.upvoted === "boolean" ? body.upvoted : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { partyId } = await context.params;

  if (!partyId) {
    return Response.json({ ok: false, error: "party_id_missing" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const identifier = user?.id ?? (await getOrCreateSessionId());

  const existingVoteResult = await supabase
    .from("event_upvotes")
    .select("id")
    .eq("event_id", partyId)
    .eq(user?.id ? "user_id" : "anonymous_session_id", identifier)
    .maybeSingle();

  if (existingVoteResult.error) {
    return Response.json({ ok: false, error: "lookup_failed" }, { status: 500 });
  }

  const desiredVoteState = await getDesiredVoteState(request);
  const currentlyUpvoted = Boolean(existingVoteResult.data?.id);
  const shouldUpvote = desiredVoteState === null ? !currentlyUpvoted : desiredVoteState;

  if (shouldUpvote && !currentlyUpvoted) {
    const insertData = {
      event_id: partyId,
      ...(user?.id ? { user_id: user.id } : { anonymous_session_id: identifier }),
    };

    const insertResult = await supabase.from("event_upvotes").insert(insertData);

    if (insertResult.error) {
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }
  }

  if (!shouldUpvote && currentlyUpvoted && existingVoteResult.data?.id) {
    const deleteResult = await supabase
      .from("event_upvotes")
      .delete()
      .eq("id", existingVoteResult.data.id);

    if (deleteResult.error) {
      return Response.json({ ok: false, error: "delete_failed" }, { status: 500 });
    }
  }

  const countResult = await supabase
    .from("event_upvotes")
    .select("id", { count: "exact", head: true })
    .eq("event_id", partyId);

  if (countResult.error) {
    return Response.json({ ok: false, error: "count_failed" }, { status: 500 });
  }

  return Response.json({
    ok: true,
    upvoted: shouldUpvote,
    upvoteCount: countResult.count ?? 0,
  });
}
