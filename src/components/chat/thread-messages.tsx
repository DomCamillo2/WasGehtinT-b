"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";

type Message = {
  id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
};

type Props = {
  threadId: string;
  currentUserId: string;
  initialMessages: Message[];
};

export function ThreadMessages({ threadId, currentUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => initialMessages);

  useEffect(() => {
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
          const row = payload.new as Message;
          setMessages((prev) => [...prev, row]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [messages],
  );

  if (!threadId) {
    return <p className="text-sm text-zinc-500">Wähle einen Chat aus.</p>;
  }

  return (
    <div className="space-y-2">
      {sorted.map((message) => {
        const own = message.sender_user_id === currentUserId;
        return (
          <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                own ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900"
              }`}
            >
              <p>{message.body}</p>
              <p className={`mt-1 text-[10px] ${own ? "text-zinc-300" : "text-zinc-500"}`}>
                {formatDateTime(message.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
