"use client";

import { createClient } from "@/lib/supabase/client";

type ThreadMessageRow = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
};

export type ThreadMessage = {
  id: string;
  threadId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
};

type SubscribeToThreadMessagesParams = {
  threadId: string;
  onMessage: (message: ThreadMessage) => void;
};

function mapThreadMessage(row: ThreadMessageRow): ThreadMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderUserId: row.sender_user_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function subscribeToThreadMessages({
  threadId,
  onMessage,
}: SubscribeToThreadMessagesParams): () => void {
  const supabase = createClient();

  const channel = supabase
    .channel(`chat-${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        const row = payload.new as ThreadMessageRow;
        onMessage(mapThreadMessage(row));
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
