import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { Card } from "@/components/ui/card";
import { getMissingSupabaseEnv, hasSupabaseEnv } from "@/lib/env";
import { getInternalAdminUserOrNull } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
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

  const adminUser = await getInternalAdminUserOrNull();
  if (adminUser) {
    redirect("/admin");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4 py-8">
      <Card className="space-y-3 p-5 sm:p-4">
        <h1 className="text-2xl font-bold text-zinc-900">Admin Login</h1>
        <p className="text-sm text-zinc-600">
          Melde dich mit einem Admin-Account an, um Einreichungen freizugeben.
        </p>

        {user ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Du bist bereits eingeloggt als {user.email ?? "unbekannt"}, aber ohne Admin-Rechte.
          </p>
        ) : null}

        <AdminLoginForm />
      </Card>
    </main>
  );
}
