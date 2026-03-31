"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { motion } from "framer-motion";
import { CirclePlus, Compass, Flame, Inbox, MessageCircle, Sparkles, X, Zap } from "lucide-react";
import { createHangoutAction, type HangoutActionState } from "@/app/actions/hangouts";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const NAV = [
  { href: "/discover", label: "Entdecken", icon: Compass },
  { href: "/spontan", label: "Spontan", icon: Zap },
  { href: "/plus", label: "Plus", icon: CirclePlus },
  { href: "/requests", label: "Anfragen", icon: Inbox },
  { href: "/chat", label: "Chat", icon: MessageCircle },
];

const initialHangoutState: HangoutActionState = {};

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [hangoutState, hangoutAction, hangoutPending] = useActionState(createHangoutAction, initialHangoutState);

  useEffect(() => {
    for (const item of NAV) {
      if (item.href === "/plus") {
        continue;
      }
      if (!pathname.startsWith(item.href)) {
        router.prefetch(item.href);
      }
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!hangoutState.success) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsComposerOpen(false);
      router.push("/spontan");
      router.refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [hangoutState.success, router]);

  return (
    <>
      {isComposerOpen ? (
        <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px]" onClick={() => setIsComposerOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl border border-zinc-200 bg-white p-4 shadow-[0_-20px_60px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">Was willst du posten?</h3>
                <p className="text-xs text-zinc-500">Spontan geht sofort live, Club-Events werden von Admin freigegeben.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500"
                aria-label="Overlay schliessen"
              >
                <X size={16} />
              </button>
            </div>

            <form action={hangoutAction} className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <Sparkles size={16} />
                Spontane Aktivitaet sofort posten
              </div>
              <div className="space-y-2">
                <input
                  name="title"
                  required
                  maxLength={120}
                  placeholder="z. B. Vorgluehen 20:00 auf dem Sand"
                  className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm outline-none focus:border-emerald-400"
                />
                <textarea
                  name="description"
                  required
                  maxLength={600}
                  rows={3}
                  placeholder="Kurz schreiben: wann, wo, was mitbringen"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />
                <div className="flex items-center gap-2">
                  <select
                    name="activityType"
                    defaultValue="meetup"
                    className="h-11 flex-1 rounded-xl border border-emerald-200 bg-white px-3 text-sm outline-none focus:border-emerald-400"
                  >
                    <option value="meetup">Treffen</option>
                    <option value="party">Vorgluehen</option>
                    <option value="sport">Sport</option>
                    <option value="chill">Chill</option>
                    <option value="other">Sonstiges</option>
                  </select>
                  <button
                    type="submit"
                    disabled={hangoutPending}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-70"
                  >
                    {hangoutPending ? "Postet..." : "Sofort posten"}
                  </button>
                </div>
              </div>
              {hangoutState.error ? (
                <p className="mt-2 rounded-xl bg-red-100 px-3 py-2 text-xs text-red-700">{hangoutState.error}</p>
              ) : null}
            </form>

            <Link
              href="/host"
              onClick={() => setIsComposerOpen(false)}
              className="block rounded-2xl border border-violet-200 bg-violet-50 p-3"
            >
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-violet-800">
                <Flame size={16} />
                Club Event einreichen
              </div>
              <p className="text-xs text-violet-700">
                Fuer Clubs, Bars und groessere Events. Geht zuerst in den Admin-Review und wird danach freigeschaltet.
              </p>
            </Link>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto max-w-md">
          <div className="mb-2 flex justify-end pr-1">
            <ThemeToggle />
          </div>
          <ul
            className="grid grid-cols-5 rounded-2xl border p-1 shadow-[0_-10px_28px_rgba(15,23,42,0.12)] backdrop-blur-md"
            style={{
              borderColor: "var(--nav-border)",
              backgroundColor: "var(--nav-bg)",
            }}
          >
          {NAV.map((item) => {
            const isPlus = item.href === "/plus";
            const active = !isPlus && pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <motion.div whileTap={{ scale: 0.97 }}>
                  {isPlus ? (
                    <button
                      type="button"
                      onClick={() => setIsComposerOpen(true)}
                      className="flex h-14 w-full flex-col items-center justify-center rounded-xl text-[11px] font-semibold text-[color:var(--muted-foreground)] transition"
                    >
                      <Icon size={18} strokeWidth={2.2} />
                      <span className="mt-1">{item.label}</span>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      prefetch
                      onMouseEnter={() => router.prefetch(item.href)}
                      onTouchStart={() => router.prefetch(item.href)}
                      onFocus={() => router.prefetch(item.href)}
                      className={clsx(
                        "flex h-14 flex-col items-center justify-center rounded-xl text-[11px] font-semibold transition",
                        active
                          ? "scale-[1.04] bg-gradient-to-b from-fuchsia-100 to-violet-100 text-fuchsia-700 shadow-[0_8px_18px_rgba(217,70,239,0.25)]"
                          : "text-[color:var(--muted-foreground)]",
                      )}
                    >
                      <Icon size={active ? 20 : 18} strokeWidth={2.2} />
                      <span className="mt-1">{item.label}</span>
                    </Link>
                  )}
                </motion.div>
              </li>
            );
          })}
          </ul>
        </div>
      </nav>
    </>
  );
}
