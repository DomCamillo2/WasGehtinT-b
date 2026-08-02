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
  const email = user.email.toLowerCase();
  const isEnvAdmin = admins.has(email);

  // When an allowlist is configured, it is authoritative (role alone cannot escalate).
  if (admins.size > 0) {
    return isEnvAdmin ? user : null;
  }

  const roleById = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const roleResult =
    roleById.error?.code === "42703" || roleById.error?.code === "PGRST204"
      ? await supabase
          .from("user_profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()
      : roleById;

  const isRoleAdmin =
    !roleResult.error && (roleResult.data?.role === "admin" || roleResult.data?.role === "owner");

  return isRoleAdmin ? user : null;
}

export async function requireInternalAdmin() {
  if (!hasSupabaseEnv()) {
    redirect("/?setup=1");
  }

  const user = await getInternalAdminUserOrNull();
  if (!user) {
    redirect("/admin/login");
  }

  return user;
}
