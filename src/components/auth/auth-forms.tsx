"use client";

import { useActionState } from "react";
import { signInAction, signUpAction } from "@/app/actions/auth";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Card } from "@/components/ui/card";

const initialState = { error: "", success: "" };

export function AuthForms() {
  const [signInState, signInFormAction, signInPending] = useActionState(
    signInAction,
    initialState,
  );
  const [signUpState, signUpFormAction, signUpPending] = useActionState(
    signUpAction,
    initialState,
  );

  return (
    <div className="mx-auto grid w-full max-w-md gap-4">
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
      </Card>

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
  );
}
