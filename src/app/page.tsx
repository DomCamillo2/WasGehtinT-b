import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForms } from "@/components/auth/auth-forms";
import { Card } from "@/components/ui/card";
import { getMissingSupabaseEnv, hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  if (!hasSupabaseEnv()) {
    const missing = getMissingSupabaseEnv();

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-6 sm:py-8">
        <div className="mb-5 text-center sm:mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">WasGehtTüb</p>
          <h1 className="mt-2 text-[1.85rem] font-bold leading-tight tracking-tight text-zinc-900 sm:text-3xl">Setup erforderlich</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Trage die fehlenden Variablen in `.env.local` ein und starte den Dev-Server neu.
          </p>
        </div>

        <Card className="space-y-2">
          <p className="text-sm font-semibold text-zinc-900">Fehlende Supabase-Variablen</p>
          {missing.map((item) => (
            <p key={item} className="text-sm text-red-700">
              - {item}
            </p>
          ))}
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/discover");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-6 sm:py-8">
      <div className="mb-5 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-4 text-center shadow-[0_12px_28px_rgba(79,70,229,0.08)] sm:mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">WasGehtTüb</p>
        <h1 className="mt-2 text-[1.95rem] font-bold leading-tight tracking-tight text-zinc-900 sm:text-3xl">
          Finde sichere WG-Partys in Tübingen
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-700">
          Die Plattform für Studis: Partys entdecken, als Gruppe anfragen und nach Zusage direkt chatten.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-zinc-700 ring-1 ring-zinc-200">Nur Uni-Mails</span>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-zinc-700 ring-1 ring-zinc-200">Gruppenanfragen</span>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-zinc-700 ring-1 ring-zinc-200">Match-Chat</span>
        </div>
      </div>
      <AuthForms />

      <p className="mt-4 text-center text-xs text-zinc-500">
        <Link href="/impressum" className="underline">Impressum</Link>
        <span className="mx-2">•</span>
        <Link href="/datenschutz" className="underline">Datenschutz</Link>
      </p>
    </div>
  );
}
