"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function userCanAccessThread(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  threadId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("v_chat_threads_with_last_message")
    .select("thread_id")
    .eq("thread_id", threadId)
    .or(`host_user_id.eq.${userId},guest_user_id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    console.error("[chat] Membership check failed:", error.message);
    return false;
  }

  return Boolean(data?.thread_id);
}

export async function sendChatMessageAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const threadId = String(formData.get("threadId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);

  if (!threadId || !body) {
    return;
  }

  const allowed = await userCanAccessThread(supabase, user.id, threadId);
  if (!allowed) {
    console.warn("[sendChatMessageAction] Denied insert for non-member thread");
    return;
  }

  const { error } = await supabase.from("chat_messages").insert({
    thread_id: threadId,
    sender_user_id: user.id,
    body,
  });

  if (error) {
    console.error("[sendChatMessageAction] Failed to insert message:", error);
    return;
  }

  revalidatePath("/chat");
}
