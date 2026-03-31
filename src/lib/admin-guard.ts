import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function getAdminMailSet() {
  const raw = process.env.INTERNAL_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((mail) => mail.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function getInternalAdminUserOrNull() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const admins = getAdminMailSet();
  const isEnvAdmin = admins.has(user.email.toLowerCase());

  const roleResult = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isRoleAdmin = !roleResult.error && roleResult.data?.role === "admin";

  if (!isEnvAdmin && !isRoleAdmin) {
    return null;
  }

  return user;
}

export async function requireInternalAdmin() {
  if (!hasSupabaseEnv()) {
    redirect("/?setup=1");
  }

  const user = await getInternalAdminUserOrNull();
  if (!user) {
    redirect("/host");
  }

  return user;
}
