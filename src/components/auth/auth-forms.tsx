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
      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Login</h2>
          <p className="text-sm text-zinc-500">Nur mit Uni-Mail möglich.</p>
        </div>
        <form action={signInFormAction} className="space-y-3">
          <input
            name="email"
            type="email"
            placeholder="du@student.uni-tuebingen.de"
            required
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
          />
          <input
            name="password"
            type="password"
            placeholder="Passwort"
            required
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
          />
          <PrimaryButton type="submit" disabled={signInPending} className="w-full">
            Einloggen
          </PrimaryButton>
          {signInState.error ? (
            <p className="text-sm text-red-600">{signInState.error}</p>
          ) : null}
        </form>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Registrieren</h2>
          <p className="text-sm text-zinc-500">
            Erstelle deinen Account mit @student.uni-tuebingen.de.
          </p>
        </div>
        <form action={signUpFormAction} className="space-y-3">
          <input
            name="displayName"
            type="text"
            placeholder="Anzeigename"
            required
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
          />
          <input
            name="email"
            type="email"
            placeholder="du@student.uni-tuebingen.de"
            required
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
          />
          <input
            name="password"
            type="password"
            placeholder="Mind. 8 Zeichen"
            required
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
          />
          <PrimaryButton type="submit" disabled={signUpPending} className="w-full">
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
