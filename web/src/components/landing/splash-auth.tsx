"use client";

import { useActionState, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { requestPasswordResetAction, signInAction } from "@/app/actions/auth";
import { SITE_LOGO_SRC } from "@/lib/site-config";

type SheetMode = "login" | null;

const initialState = { error: "", success: "" };

export function SplashAuth() {
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [showReset, setShowReset] = useState(false);
  const resetPanelId = useId();

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
      <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#0e1110] text-[#e8ecea]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(79,118,105,0.18) 0%, transparent 38%, rgba(201,111,46,0.08) 100%)",
          }}
        />

        <section className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-40 pt-14">
          <div className="relative mx-auto mb-8 mt-2 w-[200px]">
            <Image
              src={SITE_LOGO_SRC}
              alt="WasGehtTüb Logo"
              width={400}
              height={400}
              className="relative h-auto w-full"
              priority
            />
          </div>

          <p className="font-wordmark text-center text-3xl tracking-tight text-[#e8ecea] sm:text-4xl">
            WasGehtTüb
          </p>

          <h1 className="mt-4 text-center text-xl font-semibold leading-snug tracking-tight text-[#e8ecea] sm:text-2xl">
            Was geht heut’ in Tübingen?
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-relaxed text-[#8a9390]">
            Clubs, Tagesevents und Community — nur mit{" "}
            <span className="text-[#e8ecea]">@student.uni-tuebingen.de</span>
          </p>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-[rgba(232,236,234,0.1)] bg-[#0e1110] px-5 pb-5 pt-4">
          <button
            type="button"
            disabled
            className="h-11 w-full cursor-not-allowed rounded-lg border border-[rgba(232,236,234,0.12)] bg-[#181c1b] px-4 text-sm font-semibold text-[#8a9390]"
          >
            Kontoerstellung kommt später
          </button>
          <button
            type="button"
            onClick={() => setSheet("login")}
            className="mt-2 h-11 w-full rounded-lg bg-[#d48745] px-4 text-sm font-semibold text-[#2e1f1a] transition-opacity hover:opacity-90"
          >
            Bereits dabei? Einloggen
          </button>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#8a9390]">
            <Link href="/impressum" className="underline decoration-[#8a9390]/40 underline-offset-2">
              Impressum
            </Link>
            <span>·</span>
            <Link href="/nutzungsbedingungen" className="underline decoration-[#8a9390]/40 underline-offset-2">
              AGB
            </Link>
            <span>·</span>
            <Link href="/datenschutz" className="underline decoration-[#8a9390]/40 underline-offset-2">
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
              initial={{ opacity: 0.85 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.85 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto h-[62vh] w-full max-w-md rounded-t-xl border border-zinc-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">Einloggen</h2>
                <button
                  type="button"
                  onClick={() => setSheet(null)}
                  className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100"
                >
                  Schließen
                </button>
              </div>

              {!showReset ? (
                <form action={signInFormAction} className="space-y-3">
                  <label className="block text-sm font-medium text-zinc-700">
                    Uni-Mail
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c96f2e]"
                    />
                  </label>
                  <label className="block text-sm font-medium text-zinc-700">
                    Passwort
                    <input
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c96f2e]"
                    />
                  </label>
                  {signInState.error ? (
                    <p className="text-sm text-red-600">{signInState.error}</p>
                  ) : null}
                  {signInState.success ? (
                    <p className="text-sm text-emerald-700">{signInState.success}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={signInPending}
                    className="h-11 w-full rounded-lg bg-[#c96f2e] text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {signInPending ? "…" : "Einloggen"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReset(true)}
                    className="w-full text-center text-sm text-zinc-600 underline underline-offset-2"
                  >
                    Passwort vergessen?
                  </button>
                </form>
              ) : (
                <form action={resetFormAction} className="space-y-3" id={resetPanelId}>
                  <label className="block text-sm font-medium text-zinc-700">
                    Uni-Mail für Reset
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c96f2e]"
                    />
                  </label>
                  {resetState.error ? (
                    <p className="text-sm text-red-600">{resetState.error}</p>
                  ) : null}
                  {resetState.success ? (
                    <p className="text-sm text-emerald-700">{resetState.success}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={resetPending}
                    className="h-11 w-full rounded-lg bg-[#c96f2e] text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {resetPending ? "…" : "Reset-Link senden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReset(false)}
                    className="w-full text-center text-sm text-zinc-600 underline underline-offset-2"
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
