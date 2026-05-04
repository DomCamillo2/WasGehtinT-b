import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const DEFAULT_SOURCE = ".env.local";
const DEFAULT_TARGETS = ["development", "preview", "production"];

const ALIAS_TO_CANONICAL = new Map([
  ["superbase_secret_key", "SUPABASE_SECRET_KEY"],
  ["supabase_secret_key", "SUPABASE_SECRET_KEY"],
  ["cron-job_api_key", "CRON_JOB_API_KEY"],
  ["cron_job_api_key", "CRON_JOB_API_KEY"],
  ["apify_api_key", "APIFY_API_KEY"],
  ["gemini_api_key", "GEMINI_API_KEY"],
]);

function normalizeAliasKey(key) {
  return key.trim().toLowerCase();
}

function parseEnvFile(content) {
  const parsed = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed.push({ key, value });
  }

  return parsed;
}

function canonicalize(entries) {
  const finalMap = new Map();

  for (const { key, value } of entries) {
    const alias = normalizeAliasKey(key);
    const canonical = ALIAS_TO_CANONICAL.get(alias) ?? key.toUpperCase();

    if (canonical.startsWith("VERCEL_") || canonical.startsWith("TURBO_") || canonical.startsWith("NX_")) {
      continue;
    }

    if (!value) {
      continue;
    }

    finalMap.set(canonical, value);
  }

  return Array.from(finalMap.entries()).map(([key, value]) => ({ key, value }));
}

function runVercelCommand(args, input = undefined) {
  const primaryBin = process.platform === "win32" ? "vercel.cmd" : "vercel";
  const primary = spawnSync(primaryBin, args, {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (!primary.error) {
    return primary;
  }

  const escaped = args
    .map((arg) => (arg.includes(" ") ? `"${arg.replace(/"/g, '\\"')}"` : arg))
    .join(" ");

  return spawnSync("cmd.exe", ["/d", "/s", "/c", `vercel ${escaped}`], {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function syncEntry(entry, target) {
  runVercelCommand(["env", "rm", entry.key, target, "-y"]);
  const add = runVercelCommand(["env", "add", entry.key, target], `${entry.value}\n`);

  if (add.status !== 0) {
    const out = `${add.stdout || ""}${add.stderr || ""}`.trim();
    throw new Error(`Failed to sync ${entry.key} -> ${target}: ${out}`);
  }
}

function main() {
  const sourcePath = process.env.ENV_SYNC_SOURCE?.trim() || DEFAULT_SOURCE;
  const targetEnv = process.env.ENV_SYNC_TARGETS?.trim();
  const targets = targetEnv ? targetEnv.split(",").map((v) => v.trim()).filter(Boolean) : DEFAULT_TARGETS;

  const rawContent = readFileSync(sourcePath, "utf8");
  const entries = canonicalize(parseEnvFile(rawContent));

  if (entries.length === 0) {
    throw new Error(`No syncable env variables found in ${sourcePath}`);
  }

  console.log(`[sync] Source file: ${sourcePath}`);
  console.log(`[sync] Keys: ${entries.length}`);
  console.log(`[sync] Targets: ${targets.join(", ")}`);

  for (const target of targets) {
    for (const entry of entries) {
      syncEntry(entry, target);
      console.log(`[sync] ${entry.key} -> ${target}`);
    }
  }

  const list = runVercelCommand(["env", "ls"]);
  if (list.status === 0) {
    console.log(list.stdout);
  }

  console.log("[sync] Completed");
}

main();
