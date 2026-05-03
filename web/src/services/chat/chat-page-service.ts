import { getChatMessages, getChatThreads, requireUser } from "@/lib/data";

export type ChatThreadListItem = {
  id: string;
  partyId: string;
  partyRequestId: string;
  hostUserId: string;
  guestUserId: string;
  lastMessageAt: string | null;
  lastSenderUserId: string | null;
  lastMessageBody: string | null;
};

export type ChatMessageItem = {
  id: string;
  threadId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
};

export type ChatPageData = {
  currentUserId: string;
  threads: ChatThreadListItem[];
  activeThreadId: string | null;
  messages: ChatMessageItem[];
};

function mapThread(raw: {
  thread_id: string;
  party_id: string;
  party_request_id: string;
  host_user_id: string;
  guest_user_id: string;
  last_message_at: string | null;
  last_sender_user_id: string | null;
  last_message_body: string | null;
}): ChatThreadListItem {
  return {
    id: raw.thread_id,
    partyId: raw.party_id,
    partyRequestId: raw.party_request_id,
    hostUserId: raw.host_user_id,
    guestUserId: raw.guest_user_id,
    lastMessageAt: raw.last_message_at,
    lastSenderUserId: raw.last_sender_user_id,
    lastMessageBody: raw.last_message_body,
  };
}

function mapMessage(raw: {
  id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
}, threadId: string): ChatMessageItem {
  return {
    id: raw.id,
    threadId,
    senderUserId: raw.sender_user_id,
    body: raw.body,
    createdAt: raw.created_at,
  };
}

export async function loadChatPageData(searchParams: { thread?: string }): Promise<ChatPageData> {
  const { user } = await requireUser();
  const rawThreads = await getChatThreads(user.id);
  const threads = rawThreads.map(mapThread);

  const requestedThreadId = typeof searchParams.thread === "string" ? searchParams.thread : "";
  const activeThreadId = threads.some((thread) => thread.id === requestedThreadId)
    ? requestedThreadId
    : (threads[0]?.id ?? null);

  const rawMessages = activeThreadId ? await getChatMessages(activeThreadId) : [];
  const messages = rawMessages.map((message) => mapMessage(message, activeThreadId ?? ""));

  return {
    currentUserId: user.id,
    threads,
    activeThreadId,
    messages,
  };
}
