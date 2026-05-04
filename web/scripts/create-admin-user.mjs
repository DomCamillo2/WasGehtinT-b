import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = path.resolve(".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const adminKey = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !adminKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY");
  }

  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    throw new Error("Usage: node scripts/create-admin-user.mjs <email> <password>");
  }

  const admin = createClient(url, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) {
    throw listed.error;
  }

  const existing = listed.data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());

  let userId = existing?.id;
  if (!userId) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "admin" },
    });
    if (created.error || !created.data.user) {
      throw created.error || new Error("User creation failed");
    }
    userId = created.data.user.id;
    console.log("Created auth user:", userId);
  } else {
    const updated = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { role: "admin" },
    });
    if (updated.error) {
      throw updated.error;
    }
    console.log("Updated existing auth user:", userId);
  }

  const profileById = await admin
    .from("user_profiles")
    .upsert({ id: userId, role: "admin" }, { onConflict: "id" })
    .select("role")
    .single();

  if (!profileById.error) {
    console.log("Upserted user_profiles role via id column");
    return;
  }

  if (profileById.error.code !== "42703" && profileById.error.code !== "PGRST204") {
    throw profileById.error;
  }

  const profileByUserId = await admin
    .from("user_profiles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id" })
    .select("role")
    .single();

  if (profileByUserId.error) {
    throw profileByUserId.error;
  }

  console.log("Upserted user_profiles role via user_id column");
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
