#!/usr/bin/env node
/**
 * Legacy entrypoint — production sync lives in web/scripts/.
 * Keeps old CI / local commands from wiping cache with the outdated root worker.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webScript = path.join(here, "..", "web", "scripts", "sync-external-events-to-supabase.mjs");

console.warn(
  "[external-events] Root scripts/ is deprecated. Forwarding to web/scripts/sync-external-events-to-supabase.mjs",
);

const result = spawnSync(process.execPath, [webScript, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
