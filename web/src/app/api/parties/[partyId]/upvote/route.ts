import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
const ANON_UPVOTE_COOKIE = "wg_anon_upvote_session";

type RouteContext = {
  params: Promise<{ partyId: string }>;
};

type UpvoteRequestBody = {
  upvoted?: boolean;
};

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

  const cookieStore = await cookies();
  let anonymousSessionId = cookieStore.get(ANON_UPVOTE_COOKIE)?.value ?? null;
  if (!user && !anonymousSessionId) {
    anonymousSessionId = crypto.randomUUID();
    cookieStore.set(ANON_UPVOTE_COOKIE, anonymousSessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  if (!user && !anonymousSessionId) {
    return Response.json({ ok: false, error: "anonymous_session_missing" }, { status: 500 });
  }

  const existingVoteQuery = supabase.from("event_upvotes").select("id").eq("event_id", partyId);
  const existingVoteResult = user
    ? await existingVoteQuery.eq("user_id", user.id).maybeSingle()
    : await existingVoteQuery.eq("anonymous_session_id", anonymousSessionId!).maybeSingle();

  if (existingVoteResult.error) {
    return Response.json({ ok: false, error: "lookup_failed" }, { status: 500 });
  }

  const desiredVoteState = await getDesiredVoteState(request);
  const currentlyUpvoted = Boolean(existingVoteResult.data?.id);
  const shouldUpvote = desiredVoteState === null ? !currentlyUpvoted : desiredVoteState;

  if (shouldUpvote && !currentlyUpvoted) {
    const insertData = {
      event_id: partyId,
      user_id: user?.id ?? null,
      anonymous_session_id: user ? null : anonymousSessionId,
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
    anonymous: !user,
  });
}
