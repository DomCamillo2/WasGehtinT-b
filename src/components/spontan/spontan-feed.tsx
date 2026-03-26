"use client";

import { useActionState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { createHangoutAction, type HangoutActionState } from "@/app/actions/hangouts";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Card } from "@/components/ui/card";

type HangoutFeedItem = {
  id: string;
  title: string;
  description: string;
  activity_type: "sport" | "chill" | "party" | "meetup" | "other";
  created_at: string;
  user_display_name: string;
};

type Props = {
  items: HangoutFeedItem[];
};

const initialState: HangoutActionState = {};

function mapActivityLabel(activityType: HangoutFeedItem["activity_type"]): string {
  if (activityType === "sport") return "Sport";
  if (activityType === "chill") return "Chill";
  if (activityType === "party") return "Party";
  if (activityType === "meetup") return "Treffen";
  return "Sonstiges";
}

export function SpontanFeed({ items }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createHangoutAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <div className="space-y-4 pb-24">
      <Card className="space-y-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        <h1 className="text-2xl font-black tracking-tight text-zinc-900">Spontan</h1>
        <form action={action} className="space-y-2">
          <input
            name="title"
            required
            maxLength={120}
            placeholder="Worauf hast du spontan Bock?"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
          />
          <textarea
            name="description"
            required
            maxLength={600}
            rows={3}
            placeholder="z. B. Volleyball auf der Neckarinsel um 18:30"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <div className="flex items-center gap-2">
            <select
              name="activityType"
              className="h-11 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
              defaultValue="meetup"
            >
              <option value="sport">Sport</option>
              <option value="chill">Chill</option>
              <option value="party">Party</option>
              <option value="meetup">Treffen</option>
              <option value="other">Sonstiges</option>
            </select>
            <PrimaryButton type="submit" disabled={pending}>
              {pending ? "Postet..." : "Posten"}
            </PrimaryButton>
          </div>
        </form>

        {state.error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p>
        ) : null}
      </Card>

      <div className="space-y-3">
        {items.map((item, index) => {
          const initials = (item.user_display_name || "?").slice(0, 1).toUpperCase();
          return (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-700">
                    {initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{item.user_display_name}</p>
                    <p className="text-xs text-zinc-500">
                      {new Intl.DateTimeFormat("de-DE", {
                        timeZone: "Europe/Berlin",
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(item.created_at))}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                  <Zap size={12} />
                  {mapActivityLabel(item.activity_type)}
                </span>
              </div>

              <h2 className="text-base font-bold tracking-tight text-zinc-900">{item.title}</h2>
              <p className="mt-1 text-sm text-zinc-700">{item.description}</p>

              <div className="mt-3 flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  className="inline-flex h-9 items-center gap-1 rounded-xl bg-zinc-900 px-3 text-xs font-semibold text-white"
                >
                  <Users size={14} />
                  Ich bin dabei!
                </motion.button>
                <a
                  href={`/melden?type=spontan&id=${item.id}`}
                  className="text-xs font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700"
                >
                  Beitrag melden
                </a>
              </div>
            </motion.article>
          );
        })}

        {!items.length ? (
          <Card className="text-sm text-zinc-500">Noch keine spontanen Beiträge. Sei der erste 👀</Card>
        ) : null}
      </div>
    </div>
  );
}
