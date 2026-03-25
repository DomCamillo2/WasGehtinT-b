"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setSaving(true);

    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setSaving(false);

    if (updateError) {
      setError(updateError.message || "Passwort konnte nicht aktualisiert werden.");
      return;
    }

    setSuccess("Passwort aktualisiert. Du kannst dich jetzt einloggen.");
  }

  return (
    <Card className="space-y-4 p-5 sm:p-4">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Neues Passwort setzen</h2>
        <p className="text-sm text-zinc-500">
          Öffne diese Seite über den Link aus deiner E-Mail und vergib ein neues Passwort.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          name="password"
          type="password"
          placeholder="Neues Passwort (mind. 8 Zeichen)"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-base text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400"
        />
        <input
          name="confirmPassword"
          type="password"
          placeholder="Passwort wiederholen"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-base text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400"
        />

        <PrimaryButton type="submit" disabled={saving} className="h-12 w-full text-base">
          Passwort speichern
        </PrimaryButton>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <p className="text-sm text-zinc-600">
        Zurück zum Login: <Link href="/" className="font-medium text-zinc-900 underline">Startseite</Link>
      </p>
    </Card>
  );
}
