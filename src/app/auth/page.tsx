import { redirect } from "next/navigation";
import { SplashAuth } from "@/components/landing/splash-auth";
import { getMissingSupabaseEnv, hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function AuthPage() {
  if (!hasSupabaseEnv()) {
    const missing = getMissingSupabaseEnv();
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-bold text-zinc-900">Setup erforderlich</h1>
        <p className="mt-2 text-sm text-zinc-600">Fehlende Supabase-Variablen:</p>
        <ul className="mt-3 list-disc pl-6 text-sm text-red-700">
          {missing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/discover");
  }

  return <SplashAuth />;
}
