import { redirect } from "next/navigation";
import { AuthForms } from "@/components/auth/auth-forms";
import { Card } from "@/components/ui/card";
import { getMissingSupabaseEnv, hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  if (!hasSupabaseEnv()) {
    const missing = getMissingSupabaseEnv();

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">WasGehtTüb</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">Setup erforderlich</h1>
          <p className="mt-2 text-sm text-zinc-600">
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
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">WasGehtTüb</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">WG-Party Radar für Studis</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Entdecke Partys, bewerbe dich auch als Gruppe und chatte nach Match.
        </p>
      </div>
      <AuthForms />
    </div>
  );
}
