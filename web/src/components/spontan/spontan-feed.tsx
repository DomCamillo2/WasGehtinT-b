"use client";

import { useActionState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { createHangoutAction, type HangoutActionState } from "@/app/actions/hangouts";
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
    <div className="space-y-8 pb-8">
      <section className="space-y-3">
        <h1 className="font-wordmark text-3xl tracking-tight text-[color:var(--foreground)]">
          Spontan
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-[color:var(--muted-foreground)]">
          Kurz posten, was du heute noch machen willst. Ohne Account — Beiträge werden vor der
          Anzeige geprüft.
        </p>

        <form action={action} className="space-y-2 pt-1">
          <input
            name="submitterName"
            maxLength={80}
            placeholder="Dein Name"
            className="h-11 w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] px-3 text-sm text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-foreground)] focus:border-[color:var(--accent)]"
          />
          <input
            name="title"
            required
            maxLength={120}
            placeholder="Worauf hast du spontan Bock?"
            className="h-11 w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] px-3 text-sm text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-foreground)] focus:border-[color:var(--accent)]"
          />
          <input
            name="locationText"
            required
            maxLength={160}
            placeholder="Wo? z. B. Neckarinsel"
            className="h-11 w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] px-3 text-sm text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-foreground)] focus:border-[color:var(--accent)]"
          />
          <input
            name="meetupAt"
            type="datetime-local"
            required
            className="h-11 w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] px-3 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--accent)]"
          />
          <textarea
            name="description"
            required
            maxLength={600}
            rows={3}
            placeholder="Kurz: was geplant ist"
            className="w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] px-3 py-2 text-sm text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted-foreground)] focus:border-[color:var(--accent)]"
          />
          <div className="flex items-center gap-2">
            <select
              name="activityType"
              className="h-11 flex-1 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] px-3 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--accent)]"
              defaultValue="meetup"
            >
              <option value="sport">Sport</option>
              <option value="chill">Chill</option>
              <option value="party">Party</option>
              <option value="meetup">Treffen</option>
              <option value="other">Sonstiges</option>
            </select>
            <PrimaryButton type="submit" disabled={pending}>
              {pending ? "Sendet…" : "Posten"}
            </PrimaryButton>
          </div>
        </form>

        {state.error ? (
          <p className="rounded-xl border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-xl border border-[color:var(--brand-green)]/35 bg-[color:var(--brand-green-soft)] px-3 py-2 text-sm text-[color:var(--foreground)]">
            {state.success}
          </p>
        ) : null}
      </section>

      <section className="space-y-4" aria-label="Spontane Beiträge">
        {items.map((item, index) => {
          const initials = (item.userDisplayName || "?").slice(0, 1).toUpperCase();
          return (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.24) }}
              className="border-b border-[color:var(--border-soft)] pb-4"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-[color:var(--surface-elevated)] text-xs font-bold text-[color:var(--foreground)]">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                      {item.userDisplayName}
                    </p>
                    <p className="text-xs text-[color:var(--muted-foreground)]">
                      {formatDateTimeOrFallback(item.createdAt, "gerade eben")}
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                  <Zap size={12} aria-hidden />
                  {mapActivityLabel(item.activityType)}
                </span>
              </div>

              <h2 className="text-base font-semibold tracking-tight text-[color:var(--foreground)]">
                {item.title}
              </h2>
              {item.locationText ? (
                <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                  Wo: {item.locationText}
                </p>
              ) : null}
              {item.meetupAt ? (
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-[color:var(--foreground)]">
                  Wann: {formatMeetupOrFallback(item.meetupAt)}
                </p>
              ) : null}
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--foreground)]/90">
                {item.description}
              </p>

              <a
                href={`/melden?type=spontan&id=${item.id}`}
                className="mt-3 inline-block text-xs font-medium text-[color:var(--muted-foreground)] underline decoration-[color:var(--border-soft)] underline-offset-2 hover:text-[color:var(--foreground)]"
              >
                Beitrag melden
              </a>
            </motion.article>
          );
        })}

        {!items.length ? (
          <p className="py-10 text-center text-sm text-[color:var(--muted-foreground)]">
            Noch keine spontanen Beiträge. Sei der Erste.
          </p>
        ) : null}
      </section>
    </div>
  );
}
