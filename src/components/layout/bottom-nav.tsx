"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { CirclePlus, Compass, Flame, Inbox, MessageCircle, Sparkles, X } from "lucide-react";
import { createHangoutAction, type HangoutActionState } from "@/app/actions/hangouts";
import { createPartyAction, type CreatePartyActionState } from "@/app/actions/parties";

const NAV = [
  { href: "/discover", label: "Entdecken", icon: Compass },
  { href: "/plus", label: "Plus", icon: CirclePlus },
  { href: "/requests", label: "Anfragen", icon: Inbox },
  { href: "/chat", label: "Chat", icon: MessageCircle },
];

const initialHangoutState: HangoutActionState = {};
const initialPartyState: CreatePartyActionState = {
  ok: false,
  message: "",
};

const sheetFieldClassName =
  "h-11 w-full rounded-xl border bg-white/90 px-3 text-sm text-slate-900 outline-none";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const hangoutFormRef = useRef<HTMLFormElement>(null);
  const partyFormRef = useRef<HTMLFormElement>(null);
  const [hangoutState, hangoutFormAction, isHangoutPending] = useActionState(
    createHangoutAction,
    initialHangoutState,
  );
  const [partyState, partyFormAction, isPartyPending] = useActionState(
    createPartyAction,
    initialPartyState,
  );

  useEffect(() => {
    if (!hangoutState.success) {
      return;
    }

    hangoutFormRef.current?.reset();
    const openNoticeTimeoutId = window.setTimeout(() => {
      setIsComposerOpen(false);
      setSubmitNotice(hangoutState.success ?? null);
    }, 0);

    const clearNoticeTimeoutId = window.setTimeout(() => {
      setSubmitNotice(null);
    }, 2800);

    return () => {
      window.clearTimeout(openNoticeTimeoutId);
      window.clearTimeout(clearNoticeTimeoutId);
    };
  }, [hangoutState.success]);

  useEffect(() => {
    if (!partyState.ok) {
      return;
    }

    partyFormRef.current?.reset();
    const timeoutId = window.setTimeout(() => {
      setIsComposerOpen(false);
      router.push("/discover");
      router.refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [partyState.ok, router]);

  return (
    <>
      {isComposerOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px]"
          onClick={() => setIsComposerOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 mx-auto max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-[28px] border shadow-[0_-20px_60px_rgba(15,23,42,0.28)]"
            style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--surface-elevated)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-4">
              <div
                className="sticky top-0 mb-3 flex items-center justify-between pb-2"
                style={{ backgroundColor: "var(--surface-elevated)" }}
              >
                <div>
                  <h3 className="text-base font-semibold text-[color:var(--foreground)]">
                    Was willst du posten?
                  </h3>
                  <p className="text-xs text-[color:var(--muted-foreground)]">
                    {"Auch ohne Account m\u00f6glich. Alle Einreichungen werden zuerst vom Admin gepr\u00fcft."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border"
                  style={{ borderColor: "var(--border-soft)", color: "var(--muted-foreground)" }}
                  aria-label={"Overlay schlie\u00dfen"}
                >
                  <X size={16} />
                </button>
              </div>

              <form
                ref={hangoutFormRef}
                action={hangoutFormAction}
                className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3"
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <Sparkles size={16} />
                  {"Spontane Aktivit\u00e4t sofort posten"}
                </div>
                <div className="space-y-2">
                  <input
                    name="submitterName"
                    maxLength={80}
                    placeholder="Dein Name (bei Einreichung ohne Account)"
                    className={clsx(sheetFieldClassName, "border-emerald-200 focus:border-emerald-400")}
                  />
                  <input
                    name="title"
                    required
                    maxLength={120}
                    placeholder={"z. B. Vorgl\u00fchen 20:00 auf dem Sand"}
                    className={clsx(sheetFieldClassName, "border-emerald-200 focus:border-emerald-400")}
                  />
                  <input
                    name="locationText"
                    required
                    maxLength={160}
                    placeholder="Wo? z. B. Neckarinsel"
                    className={clsx(sheetFieldClassName, "border-emerald-200 focus:border-emerald-400")}
                  />
                  <input
                    name="meetupAt"
                    type="datetime-local"
                    required
                    className={clsx(sheetFieldClassName, "border-emerald-200 focus:border-emerald-400")}
                  />
                  <textarea
                    name="description"
                    required
                    maxLength={600}
                    rows={3}
                    placeholder="Beschreibung: was geplant ist und was man mitbringen soll"
                    className="w-full rounded-xl border border-emerald-200 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      name="activityType"
                      defaultValue="meetup"
                      className={clsx(
                        "h-11 flex-1 rounded-xl border bg-white/90 px-3 text-sm text-slate-900 outline-none",
                        "border-emerald-200 focus:border-emerald-400",
                      )}
                    >
                      <option value="meetup">Treffen</option>
                      <option value="party">{"Vorgl\u00fchen"}</option>
                      <option value="sport">Sport</option>
                      <option value="chill">Chill</option>
                      <option value="other">Sonstiges</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isHangoutPending}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-70"
                    >
                      {isHangoutPending ? "Sendet..." : "Zur Freigabe einreichen"}
                    </button>
                  </div>
                </div>
                {hangoutState.error ? (
                  <p className="mt-2 rounded-xl bg-red-100 px-3 py-2 text-xs text-red-700">
                    {hangoutState.error}
                  </p>
                ) : null}
              </form>

              <form
                ref={partyFormRef}
                action={partyFormAction}
                className="rounded-2xl border border-violet-200 bg-violet-50 p-3"
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-800">
                  <Flame size={16} />
                  Club Event einreichen
                </div>
                <div className="space-y-2">
                  <input
                    name="submitterName"
                    maxLength={80}
                    placeholder="Dein Name (bei Einreichung ohne Account)"
                    className={clsx(sheetFieldClassName, "border-violet-200 focus:border-violet-400")}
                  />
                  <input
                    name="title"
                    required
                    maxLength={120}
                    placeholder="Titel des Club-Events"
                    className={clsx(sheetFieldClassName, "border-violet-200 focus:border-violet-400")}
                  />
                  <textarea
                    name="description"
                    maxLength={600}
                    rows={3}
                    placeholder="Kurzbeschreibung"
                    className="w-full rounded-xl border border-violet-200 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      name="startsAt"
                      type="datetime-local"
                      required
                      className={clsx(sheetFieldClassName, "border-violet-200 focus:border-violet-400")}
                    />
                    <input
                      name="endsAt"
                      type="datetime-local"
                      required
                      className={clsx(sheetFieldClassName, "border-violet-200 focus:border-violet-400")}
                    />
                  </div>
                  <input
                    name="locationName"
                    maxLength={140}
                    placeholder="Ort (optional)"
                    className={clsx(sheetFieldClassName, "border-violet-200 focus:border-violet-400")}
                  />
                  <input type="hidden" name="vibeId" value="1" />
                  <input type="hidden" name="defaultVibeId" value="1" />
                  <input type="hidden" name="maxGuests" value="50" />
                  <input type="hidden" name="contributionEur" value="0" />
                  <input type="hidden" name="publishMode" value="published" />
                  <button
                    type="submit"
                    disabled={isPartyPending}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-70"
                  >
                    {isPartyPending ? "Sendet..." : "Zur Freigabe einreichen"}
                  </button>
                </div>
                {partyState.message ? (
                  <p
                    className={clsx(
                      "mt-2 rounded-xl px-3 py-2 text-xs",
                      partyState.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
                    )}
                  >
                    {partyState.message}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {submitNotice ? (
        <div className="fixed inset-x-0 top-4 z-50 mx-auto w-full max-w-md px-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-[0_12px_30px_rgba(5,150,105,0.2)]">
            {submitNotice}
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto max-w-md">
          <ul
            className="grid grid-cols-4 rounded-2xl border p-1 shadow-[0_-10px_28px_rgba(15,23,42,0.12)] backdrop-blur-md"
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
                      prefetch={false}
                      onMouseEnter={() => router.prefetch(item.href)}
                      onTouchStart={() => router.prefetch(item.href)}
                      onFocus={() => router.prefetch(item.href)}
                      className={clsx(
                        "flex h-14 flex-col items-center justify-center rounded-xl text-[11px] font-semibold transition",
                        active
                          ? "scale-[1.04] bg-gradient-to-b from-fuchsia-500/20 to-violet-500/20 text-[color:var(--accent-strong)] shadow-[0_8px_18px_rgba(217,70,239,0.18)]"
                          : "text-[color:var(--muted-foreground)]",
                      )}
                    >
                      <Icon size={active ? 20 : 18} strokeWidth={2.2} />
                      <span className="mt-1">{item.label}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
