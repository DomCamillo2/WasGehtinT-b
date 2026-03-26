"use client";

import { useId, useState } from "react";
import { useActionState } from "react";
import { requestPasswordResetAction, signInAction, signUpAction } from "@/app/actions/auth";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Card } from "@/components/ui/card";

const initialState = { error: "", success: "" };

export function AuthForms() {
  const [showReset, setShowReset] = useState(false);
  const [showOptionalProfileFields, setShowOptionalProfileFields] = useState(false);
  const resetPanelId = useId();

  const [signInState, signInFormAction, signInPending] = useActionState(
    signInAction,
    initialState,
  );
  const [signUpState, signUpFormAction, signUpPending] = useActionState(
    signUpAction,
    initialState,
  );
  const [resetState, resetFormAction, resetPending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <div className="mx-auto grid w-full max-w-md gap-4">
      <div id="login">
      <Card className="space-y-4 p-5 sm:p-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Login</h2>
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
          <PrimaryButton type="submit" disabled={signInPending} className="h-12 w-full text-base">
            Einloggen
          </PrimaryButton>
          {signInState.error ? (
            <p className="text-sm text-red-600">{signInState.error}</p>
          ) : null}
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
              <PrimaryButton type="submit" disabled={resetPending} tone="ghost" className="h-11 w-full">
                Reset-Link senden
              </PrimaryButton>
              {resetState.error ? <p className="text-sm text-red-600">{resetState.error}</p> : null}
              {resetState.success ? <p className="text-sm text-emerald-700">{resetState.success}</p> : null}
            </form>
          ) : null}
        </div>
      </Card>
      </div>

      <div id="register">
      <Card className="space-y-4 p-5 sm:p-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Registrieren</h2>
          <p className="text-sm text-zinc-500">
            Erstelle deinen Account mit @student.uni-tuebingen.de.
          </p>
        </div>
        <form action={signUpFormAction} className="space-y-3">
          <input
            name="displayName"
            type="text"
            placeholder="Anzeigename"
            autoComplete="nickname"
            required
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-base text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400"
          />
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
            placeholder="Mind. 8 Zeichen"
            autoComplete="new-password"
            required
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-base text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400"
          />
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <button
              type="button"
              onClick={() => setShowOptionalProfileFields((prev) => !prev)}
              className="flex w-full items-center justify-between text-left"
              aria-expanded={showOptionalProfileFields}
            >
              <span className="text-sm font-medium text-zinc-800">Optionale Profilangaben</span>
              <span className="text-zinc-500">{showOptionalProfileFields ? "−" : "+"}</span>
            </button>

            {showOptionalProfileFields ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select
                    name="gender"
                    defaultValue=""
                    className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                  >
                    <option value="">Geschlecht</option>
                    <option value="female">weiblich</option>
                    <option value="male">männlich</option>
                    <option value="diverse">divers</option>
                  </select>
                  <input
                    name="age"
                    type="number"
                    min={16}
                    max={99}
                    placeholder="Alter"
                    className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-base text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400"
                  />
                </div>
                <input
                  name="studyProgram"
                  type="text"
                  placeholder="Studiengang"
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-base text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400"
                />
                <div className="space-y-1">
                  <label htmlFor="signup-avatar" className="text-xs font-medium text-zinc-600">
                    Profilbild
                  </label>
                  <input
                    id="signup-avatar"
                    name="avatar"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200"
                  />
                  <p className="text-[11px] text-zinc-500">Max. 3MB, JPG/PNG/WEBP.</p>
                </div>
              </div>
            ) : null}
          </div>
          <PrimaryButton type="submit" disabled={signUpPending} className="h-12 w-full text-base">
            Account erstellen
          </PrimaryButton>
          {signUpState.error ? (
            <p className="text-sm text-red-600">{signUpState.error}</p>
          ) : null}
          {signUpState.success ? (
            <p className="text-sm text-emerald-700">{signUpState.success}</p>
          ) : null}
        </form>
      </Card>
      </div>
    </div>
  );
}
