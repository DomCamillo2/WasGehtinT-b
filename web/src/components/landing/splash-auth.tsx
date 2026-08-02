"use client";

import { useActionState, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { requestPasswordResetAction, signInAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SITE_LOGO_SRC } from "@/lib/site-config";

type SheetMode = "login" | null;

const initialState = { error: "", success: "" };
const easeOut: [number, number, number, number] = [0, 0, 0.2, 1];

export function SplashAuth() {
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [showReset, setShowReset] = useState(false);
  const resetPanelId = useId();
  const reduce = useReducedMotion();

  const [signInState, signInFormAction, signInPending] = useActionState(
    signInAction,
    initialState,
  );
  const [resetState, resetFormAction, resetPending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <>
      <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[color:var(--background)] text-[color:var(--foreground)]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 45% at 50% 0%, var(--brand-green-soft), transparent 60%), linear-gradient(180deg, transparent 50%, var(--accent-soft) 100%)",
          }}
          aria-hidden
        />

        <header className="relative z-10 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <Link
            href="/"
            className="rounded-md text-sm font-medium text-[color:var(--muted-foreground)] outline-none hover:text-[color:var(--foreground)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
          >
            ← Willkommen
          </Link>
          <ThemeToggle />
        </header>

        <section className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-44 pt-10">
          <motion.div
            className="mx-auto w-[168px]"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.4, ease: easeOut }}
          >
            <Image
              src={SITE_LOGO_SRC}
              alt="WasGehtTüb Logo"
              width={336}
              height={336}
              className="h-auto w-full"
              priority
            />
          </motion.div>

          <motion.p
            className="font-wordmark mt-6 text-center text-3xl tracking-tight sm:text-4xl"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.1, ease: easeOut }}
          >
            WasGehtTüb
          </motion.p>

          <h1 className="mt-4 text-center text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
            Schön, dass du da bist.
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-relaxed text-[color:var(--muted-foreground)]">
            Mit deiner{" "}
            <span className="text-[color:var(--foreground)]">@student.uni-tuebingen.de</span>{" "}
            Mail einloggen — und direkt sehen, was heute läuft.
          </p>
        </section>

        <div
          className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4"
          style={{
            borderColor: "var(--border-soft)",
            background: "color-mix(in srgb, var(--background) 92%, transparent)",
          }}
        >
          <Link
            href="/discover?ui=new"
            className="flex h-11 w-full items-center justify-center rounded-xl border px-4 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              borderColor: "var(--border-soft)",
              background: "var(--surface-elevated)",
              color: "var(--foreground)",
            }}
          >
            Erst mal nur stöbern
          </Link>
          <button
            type="button"
            onClick={() => setSheet("login")}
            className="mt-2 h-11 w-full rounded-xl bg-[color:var(--accent)] px-4 text-sm font-semibold text-[color:var(--accent-dark-text)] transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            Einloggen
          </button>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[color:var(--muted-foreground)]">
            <Link href="/impressum" className="underline decoration-current/40 underline-offset-2">
              Impressum
            </Link>
            <span>·</span>
            <Link
              href="/nutzungsbedingungen"
              className="underline decoration-current/40 underline-offset-2"
            >
              AGB
            </Link>
            <span>·</span>
            <Link href="/datenschutz" className="underline decoration-current/40 underline-offset-2">
              Datenschutz
            </Link>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {sheet ? (
          <>
            <motion.button
              key="overlay"
              type="button"
              aria-label="Bottom Sheet schließen"
              className="fixed inset-0 z-40 bg-black/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSheet(null)}
            />

            <motion.section
              key="sheet"
              initial={{ y: 24, opacity: 0.9 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0.9 }}
              transition={{ duration: 0.22, ease: easeOut }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[72vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] p-4 shadow-[0_8px_32px_var(--shadow-color)]"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Einloggen</h2>
                <button
                  type="button"
                  onClick={() => setSheet(null)}
                  className="rounded-lg px-2 py-1 text-sm text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-soft)]"
                >
                  Schließen
                </button>
              </div>

              {!showReset ? (
                <form action={signInFormAction} className="space-y-3">
                  <label className="block text-sm font-medium text-[color:var(--foreground)]">
                    Uni-Mail
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="field-surface mt-1 h-11 w-full rounded-xl px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
                    />
                  </label>
                  <label className="block text-sm font-medium text-[color:var(--foreground)]">
                    Passwort
                    <input
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      className="field-surface mt-1 h-11 w-full rounded-xl px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
                    />
                  </label>
                  {signInState.error ? (
                    <p className="text-sm text-red-600 dark:text-red-400">{signInState.error}</p>
                  ) : null}
                  {signInState.success ? (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      {signInState.success}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={signInPending}
                    className="h-11 w-full rounded-xl bg-[color:var(--accent)] text-sm font-semibold text-[color:var(--accent-dark-text)] disabled:opacity-60"
                  >
                    {signInPending ? "…" : "Einloggen"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReset(true)}
                    className="w-full text-center text-sm text-[color:var(--muted-foreground)] underline underline-offset-2"
                  >
                    Passwort vergessen?
                  </button>
                </form>
              ) : (
                <form action={resetFormAction} className="space-y-3" id={resetPanelId}>
                  <label className="block text-sm font-medium text-[color:var(--foreground)]">
                    Uni-Mail für Reset
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="field-surface mt-1 h-11 w-full rounded-xl px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]"
                    />
                  </label>
                  {resetState.error ? (
                    <p className="text-sm text-red-600 dark:text-red-400">{resetState.error}</p>
                  ) : null}
                  {resetState.success ? (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      {resetState.success}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={resetPending}
                    className="h-11 w-full rounded-xl bg-[color:var(--accent)] text-sm font-semibold text-[color:var(--accent-dark-text)] disabled:opacity-60"
                  >
                    {resetPending ? "…" : "Reset-Link senden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReset(false)}
                    className="w-full text-center text-sm text-[color:var(--muted-foreground)] underline underline-offset-2"
                  >
                    Zurück zum Login
                  </button>
                </form>
              )}
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
