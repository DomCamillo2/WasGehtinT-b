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

export async function requireInternalAdmin() {
  if (!hasSupabaseEnv()) {
    redirect("/?setup=1");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/");
  }

  const admins = getAdminMailSet();
  if (!admins.has(user.email.toLowerCase())) {
    redirect("/host");
  }

  return user;
}
