import { Card } from "@/components/ui/card";
import { WelcomePage } from "@/components/landing/welcome-page";
import { getMissingSupabaseEnv, hasSupabaseEnv } from "@/lib/env";
import { getCurrentUserOrNull } from "@/services/auth/session-service";

export default async function Home() {
  if (!hasSupabaseEnv()) {
    const missing = getMissingSupabaseEnv();

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-6 sm:py-8">
        <div className="mb-5 text-center sm:mb-6">
          <p className="font-wordmark text-2xl tracking-tight text-[color:var(--foreground)]">
            WasGehtTüb
          </p>
          <h1 className="mt-3 text-[1.85rem] font-bold leading-tight tracking-tight text-[color:var(--foreground)] sm:text-3xl">
            Setup erforderlich
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
            Trage die fehlenden Variablen in `.env.local` ein und starte den Dev-Server neu.
          </p>
        </div>

        <Card className="space-y-2">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">
            Fehlende Supabase-Variablen
          </p>
          {missing.map((item) => (
            <p key={item} className="text-sm text-red-700 dark:text-red-400">
              - {item}
            </p>
          ))}
        </Card>
      </div>
    );
  }

  const user = await getCurrentUserOrNull();
  return <WelcomePage isAuthenticated={Boolean(user)} />;
}
