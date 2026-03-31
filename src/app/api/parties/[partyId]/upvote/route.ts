import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ partyId: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { partyId } = await context.params;

  if (!partyId) {
    return Response.json({ ok: false, error: "party_id_missing" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const existingVoteResult = await supabase
    .from("party_upvotes")
    .select("id")
    .eq("party_id", partyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingVoteResult.error) {
    return Response.json({ ok: false, error: "lookup_failed" }, { status: 500 });
  }

  let upvoted = false;

  if (existingVoteResult.data?.id) {
    const deleteResult = await supabase
      .from("party_upvotes")
      .delete()
      .eq("id", existingVoteResult.data.id)
      .eq("user_id", user.id);

    if (deleteResult.error) {
      return Response.json({ ok: false, error: "delete_failed" }, { status: 500 });
    }
  } else {
    const insertResult = await supabase.from("party_upvotes").insert({
      party_id: partyId,
      user_id: user.id,
    });

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
