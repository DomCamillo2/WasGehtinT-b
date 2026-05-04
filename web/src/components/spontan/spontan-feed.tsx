"use client";

import { useActionState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { createHangoutAction, type HangoutActionState } from "@/app/actions/hangouts";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SpontanFeedItem } from "@/services/spontan/spontan-feed-view-model";

type Props = {
  items: SpontanFeedItem[];
};

const initialState: HangoutActionState = {};

function formatDateTimeOrFallback(value: string, fallback: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function formatMeetupOrFallback(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "offen";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function mapActivityLabel(activityType: SpontanFeedItem["activityType"]): string {
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
      <Card className="space-y-3 border border-[color:var(--border-soft)] shadow-[var(--shadow-soft)]">
        <h1 className="text-2xl font-black tracking-tight text-[color:var(--text-main)]">Spontan</h1>
        <p className="text-xs text-[color:var(--text-muted)]">
          Einreichungen sind auch ohne Account möglich und werden vor Anzeige vom Admin geprüft.
        </p>
        <form action={action} className="space-y-2">
          <input
            name="submitterName"
            maxLength={80}
            placeholder="Dein Name (bei Einreichung ohne Account)"
            className="h-11 w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] px-3 text-sm text-[color:var(--text-main)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent-strong)]"
          />
          <input
            name="title"
            required
            maxLength={120}
            placeholder="Worauf hast du spontan Bock?"
            className="h-11 w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] px-3 text-sm text-[color:var(--text-main)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent-strong)]"
          />
          <input
            name="locationText"
            required
            maxLength={160}
            placeholder="Wo? z. B. Neckarinsel"
            className="h-11 w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] px-3 text-sm text-[color:var(--text-main)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent-strong)]"
          />
          <input
            name="meetupAt"
            type="datetime-local"
            required
            className="h-11 w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] px-3 text-sm text-[color:var(--text-main)] outline-none focus:border-[color:var(--accent-strong)]"
          />
          <textarea
            name="description"
            required
            maxLength={600}
            rows={3}
            placeholder="Beschreibung: was geplant ist und was man mitbringen soll"
            className="w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm text-[color:var(--text-main)] outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent-strong)]"
          />
          <div className="flex items-center gap-2">
            <select
              name="activityType"
              className="h-11 flex-1 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] px-3 text-sm text-[color:var(--text-main)] outline-none focus:border-[color:var(--accent-strong)]"
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
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {state.success}
          </p>
        ) : null}
      </Card>

      <div className="space-y-3">
        {items.map((item, index) => {
          const initials = (item.userDisplayName || "?").slice(0, 1).toUpperCase();
          return (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--bg-surface)] p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--bg-surface-2)] text-xs font-bold text-[color:var(--text-main)]">
                    {initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-main)]">{item.userDisplayName}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {formatDateTimeOrFallback(item.createdAt, "gerade eben")}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--accent)]/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent-strong)]">
                  <Zap size={12} />
                  {mapActivityLabel(item.activityType)}
                </span>
              </div>

              <h2 className="text-base font-bold tracking-tight text-[color:var(--text-main)]">{item.title}</h2>
              {item.locationText ? (
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">Wo: {item.locationText}</p>
              ) : null}
              {item.meetupAt ? (
                <p className="mt-0.5 text-base font-semibold tabular-nums text-[color:var(--text-main)]">
                  Wann: {formatMeetupOrFallback(item.meetupAt)}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-[color:var(--text-main)]/90">{item.description}</p>

              <div className="mt-3 flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  className="wg-cta-attention inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[color:var(--accent)] px-5 text-sm font-semibold text-[color:var(--accent-dark-text)]"
                >
                  <Users size={18} />
                  Ich bin dabei!
                </motion.button>
                <a
                  href={`/melden?type=spontan&id=${item.id}`}
                  className="text-xs font-medium text-[color:var(--text-muted)] underline decoration-[color:var(--border-soft)] underline-offset-2 hover:text-[color:var(--text-main)]"
                >
                  Beitrag melden
                </a>
              </div>
            </motion.article>
          );
        })}

        {!items.length ? (
          <Card className="border border-[color:var(--border-soft)] text-sm text-[color:var(--text-muted)]">
            Noch keine spontanen Beiträge. Sei der Erste.
          </Card>
        ) : null}
      </div>
    </div>
  );
}
