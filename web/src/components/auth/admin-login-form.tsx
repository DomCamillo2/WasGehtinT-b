"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "@/app/actions/auth";

const initialState = { error: "", success: "" };

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="redirectTo" value="/admin" />

      <input
        name="email"
        type="email"
        placeholder="admin@..."
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
        disabled={pending}
        className="h-12 w-full rounded-xl bg-zinc-900 text-base font-semibold text-white disabled:opacity-60"
      >
        Als Admin einloggen
      </button>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <p className="pt-1 text-xs text-zinc-500">
        Dieser Bereich ist nur für freigegebene Admin-Accounts. Zur normalen App geht es über{" "}
        <Link href="/discover" className="font-medium text-zinc-700 underline">
          Discover
        </Link>
        .
      </p>
    </form>
  );
}
