import fs from "fs";
import path from "path";
import pg from "pg";

const { Client } = pg;

function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

const migrationArg = process.argv[2];
if (!migrationArg) {
  console.error("Usage: node --env-file=.env.local scripts/apply-sql-migration-file.mjs <migration-file>");
  process.exit(1);
}

const migrationPath = path.resolve(process.cwd(), migrationArg);
if (!fs.existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`);
  process.exit(1);
}

const dbHost = getEnv("SUPABASE_DB_HOST") || "zntlopkzeklxdfvldugb.supabase.co";
const dbPort = Number(getEnv("SUPABASE_DB_PORT") || "5432");
const dbName = getEnv("SUPABASE_DB_NAME") || "postgres";
const dbUser = getEnv("SUPABASE_DB_USER") || "postgres.zntlopkzeklxdfvldugb";
const dbPassword = getEnv("SUPABASE_DB_PASSWORD");

if (!dbPassword) {
  console.error("Missing SUPABASE_DB_PASSWORD environment variable.");
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, "utf8");
const client = new Client({
  host: dbHost,
  port: dbPort,
  database: dbName,
  user: dbUser,
  password: dbPassword,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected to Supabase Postgres");

  await client.query("begin");
  await client.query(sql);
  await client.query("commit");

  console.log("Migration applied successfully:", migrationArg);
} catch (error) {
  try {
    await client.query("rollback");
  } catch {}

  const message = error instanceof Error ? error.message : String(error);
  console.error("Migration failed:", message);
  process.exitCode = 1;
} finally {
  await client.end();
}
