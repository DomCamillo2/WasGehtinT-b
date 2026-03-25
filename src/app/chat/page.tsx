import Link from "next/link";
import { sendChatMessageAction } from "@/app/actions/chat";
import { AppShell } from "@/components/layout/app-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { ThreadMessages } from "@/components/chat/thread-messages";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { getChatMessages, getChatThreads, requireUser } from "@/lib/data";

type SearchParams = Promise<{ thread?: string }>;

export default async function ChatPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireUser();
  const params = await searchParams;

  const threads = await getChatThreads(user.id);
  const activeThreadId =
    params.thread && threads.some((thread) => thread.thread_id === params.thread)
      ? params.thread
      : threads[0]?.thread_id;

  const messages = activeThreadId ? await getChatMessages(activeThreadId) : [];

  return (
    <AppShell>
      <ScreenHeader title="Chat" subtitle="Nur nach erfolgreichem Match." />

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {threads.length ? (
          threads.map((thread) => (
            <Link
              key={thread.thread_id}
              href={`/chat?thread=${thread.thread_id}`}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${
                thread.thread_id === activeThreadId
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-700"
              }`}
            >
              Chat {thread.thread_id.slice(0, 6)}
            </Link>
          ))
        ) : (
          <Card className="w-full">
            <p className="text-sm text-zinc-500">Noch kein Chat aktiv.</p>
          </Card>
        )}
      </div>

      {activeThreadId ? (
        <Card className="space-y-3">
          <ThreadMessages
            key={activeThreadId}
            threadId={activeThreadId}
            currentUserId={user.id}
            initialMessages={messages}
          />
          <form action={sendChatMessageAction} className="flex items-center gap-2 border-t border-zinc-200 pt-2">
            <input type="hidden" name="threadId" value={activeThreadId} />
            <input
              name="body"
              type="text"
              required
              placeholder="Nachricht schreiben"
              className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
            />
            <PrimaryButton type="submit">Senden</PrimaryButton>
          </form>
        </Card>
      ) : null}
    </AppShell>
  );
}
