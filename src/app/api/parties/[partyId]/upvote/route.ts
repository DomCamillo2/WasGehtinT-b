import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ partyId: string }>;
};

async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("anon_session_id")?.value;
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    (await cookies()).set("anon_session_id", sessionId, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }
  
  return sessionId;
}

export async function POST(_: Request, context: RouteContext) {
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
    .from("party_upvotes")
    .select("id")
    .eq("party_id", partyId)
    .eq(user?.id ? "user_id" : "anonymous_session_id", identifier)
    .maybeSingle();

  if (existingVoteResult.error) {
    return Response.json({ ok: false, error: "lookup_failed" }, { status: 500 });
  }

  let upvoted = false;

  if (existingVoteResult.data?.id) {
    const deleteResult = await supabase
      .from("party_upvotes")
      .delete()
      .eq("id", existingVoteResult.data.id);

    if (deleteResult.error) {
      return Response.json({ ok: false, error: "delete_failed" }, { status: 500 });
    }
  } else {
    const insertData = {
      party_id: partyId,
      ...(user?.id ? { user_id: user.id } : { anonymous_session_id: identifier }),
    };

    const insertResult = await supabase.from("party_upvotes").insert(insertData);

    if (insertResult.error) {
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    upvoted = true;
  }

  const countResult = await supabase
    .from("party_upvotes")
    .select("id", { count: "exact", head: true })
    .eq("party_id", partyId);

  if (countResult.error) {
    return Response.json({ ok: false, error: "count_failed" }, { status: 500 });
  }

  return Response.json({
    ok: true,
    upvoted,
    upvoteCount: countResult.count ?? 0,
  });
}
