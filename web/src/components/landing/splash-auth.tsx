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
      <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#0f0c29] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(75%_55%_at_50%_10%,rgba(232,63,122,0.26),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_80%_90%,rgba(140,82,255,0.18),transparent_70%)]" />
        </div>

        <section className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-36 pt-12">
          <div className="relative mx-auto mb-6 mt-4 w-[230px]">
            <div className="absolute -inset-6 rounded-full bg-fuchsia-500/25 blur-3xl" />
            <Image
              src={SITE_LOGO_SRC}
              alt="WasGehtTüb Logo"
              width={460}
              height={460}
              className="relative h-auto w-full"
              priority
            />
          </div>

          <h1 className="text-center text-4xl font-black leading-tight tracking-tight text-white">
            Studierende treffen.
            <br />
            Sicher feiern.
          </h1>

          <p className="mx-auto mt-4 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-center text-xs font-semibold text-white/90 backdrop-blur">
            Exklusiv mit @student.uni-tuebingen.de
          </p>

          <div className="mt-7 space-y-2.5 text-sm text-white/92">
            <p>Nur für echte Studis</p>
            <p>Alle WG-Partys & Events in Tübingen auf einen Blick</p>
            <p>Spontane Match-Chats</p>
          </div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-5 pb-5 pt-3">
          <div className="rounded-3xl border border-white/10 bg-black/35 p-3 backdrop-blur-xl">
            <button
              type="button"
              disabled
              className="h-12 w-full cursor-not-allowed rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white/65"
            >
              Kontoerstellung kommt später (Stay tuned)
            </button>
            <button
              type="button"
              onClick={() => setSheet("login")}
              className="mt-2 h-11 w-full rounded-2xl border border-white/25 bg-white/5 px-4 text-sm font-semibold text-white"
            >
              Bereits dabei? Einloggen
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/65">
            <Link href="/impressum" className="underline decoration-white/30 underline-offset-2">
              Impressum
            </Link>
            <span>•</span>
            <Link href="/nutzungsbedingungen" className="underline decoration-white/30 underline-offset-2">
              AGB
            </Link>
            <span>•</span>
            <Link href="/datenschutz" className="underline decoration-white/30 underline-offset-2">
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
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheet(null)}
            />

            <motion.section
              key="sheet"
              initial={{ y: "100%", opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.8 }}
              transition={{ type: "spring", damping: 30, stiffness: 290 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto h-[62vh] w-full max-w-md rounded-t-3xl border border-zinc-200 bg-white p-4 shadow-2xl"
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-300" />

              {sheet === "login" ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900">Einloggen</h2>
                    <p className="text-sm text-zinc-500">Nur mit Uni-Mail möglich.</p>
                  </div>

                  <form action={signInFormAction} className="space-y-3">
                    <input
                      name="email"
                      type="email"
                      placeholder="du@student.uni-tuebingen.de"
                      autoComplete="email"
                      inputMode="email"
                      required
                      className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-base text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400"
                    />
                    <input
                      name="password"
                      type="password"
                      placeholder="Passwort"
                      autoComplete="current-password"
                      required
                      className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-base text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400"
                    />
                    <button
                      type="submit"
                      disabled={signInPending}
                      className="h-12 w-full rounded-xl bg-zinc-900 text-base font-semibold text-white disabled:opacity-60"
                    >
                      Einloggen
                    </button>
                    {signInState.error ? <p className="text-sm text-red-600">{signInState.error}</p> : null}
                  </form>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <button
                      type="button"
                      onClick={() => setShowReset((prev) => !prev)}
                      aria-expanded={showReset}
                      aria-controls={resetPanelId}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <span className="text-sm font-medium text-zinc-800">Passwort vergessen?</span>
                      <span className="text-zinc-500">{showReset ? "−" : "+"}</span>
                    </button>

                    {showReset ? (
                      <form id={resetPanelId} action={resetFormAction} className="mt-2 space-y-2">
                        <input
                          name="email"
                          type="email"
                          placeholder="du@student.uni-tuebingen.de"
                          autoComplete="email"
                          inputMode="email"
                          required
                          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400"
                        />
                        <button
                          type="submit"
                          disabled={resetPending}
                          className="h-11 w-full rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-900 disabled:opacity-60"
                        >
                          Reset-Link senden
                        </button>
                        {resetState.error ? <p className="text-sm text-red-600">{resetState.error}</p> : null}
                        {resetState.success ? <p className="text-sm text-emerald-700">{resetState.success}</p> : null}
                      </form>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  <p className="font-semibold text-zinc-700">Kontoerstellung ist aktuell deaktiviert.</p>
                  <p>Dieses Feature kommt später. Stay tuned.</p>
                </div>
              )}
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
