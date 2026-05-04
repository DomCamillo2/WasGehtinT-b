"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "@/lib/format";
import {
  subscribeToThreadMessages,
  type ThreadMessage,
} from "@/services/chat/thread-messages-service";

type Props = {
  threadId: string;
  currentUserId: string;
  initialMessages: ThreadMessage[];
};

export function ThreadMessages({ threadId, currentUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState<ThreadMessage[]>(() => initialMessages);

  useEffect(() => {
    return subscribeToThreadMessages({
      threadId,
      onMessage: (message) => {
        setMessages((prev) => [...prev, message]);
      },
    });
  }, [threadId]);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages],
  );

  if (!threadId) {
    return <p className="text-sm text-zinc-500">Wähle einen Chat aus.</p>;
  }

  return (
    <div className="space-y-2">
      {sorted.map((message) => {
        const own = message.senderUserId === currentUserId;
        return (
          <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                own ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900"
              }`}
            >
              <p>{message.body}</p>
              <p className={`mt-1 text-[10px] ${own ? "text-zinc-300" : "text-zinc-500"}`}>
                {formatDateTime(message.createdAt)}
              </p>
              {!own ? (
                <a
                  href={`/melden?type=chat&id=${message.id}`}
                  className={`mt-1 inline-block text-[10px] underline underline-offset-2 ${
                    own ? "text-zinc-300" : "text-zinc-500"
                  }`}
                >
                  Beitrag melden
                </a>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
