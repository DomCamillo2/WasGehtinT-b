"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  const threadId = String(formData.get("threadId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!threadId || !body) {
    return;
  }

  const { error } = await supabase.from("chat_messages").insert({
    thread_id: threadId,
    sender_user_id: user.id,
    body,
  });

  if (error) {
    return;
  }

  revalidatePath("/chat");
}
