import { createClient } from "@supabase/supabase-js";

function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function getRequiredEnvValue(names, errorMessage) {
  for (const name of names) {
    const value = getEnv(name);
    if (value) {
      return value;
    }
  }

  throw new Error(errorMessage);
}

function getOptionalEnvValue(names) {
  for (const name of names) {
    const value = getEnv(name);
    if (value) {
      return value;
    }
  }

  return "";
}

async function checkRestApi(url, key) {
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/v_external_events_public?select=id&limit=1`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`REST endpoint check failed (${response.status}): ${body.slice(0, 500)}`);
  }

  return {
    status: response.status,
    bodyPreview: body.slice(0, 160),
  };
}

async function checkDbQuery(supabase) {
  const startedAt = Date.now();
  const { count, error } = await supabase
    .from("v_external_events_public")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`Database query failed: ${error.message} (${error.code ?? "no_code"})`);
  }

  return {
    durationMs: Date.now() - startedAt,
    count,
  };
}

function buildKeyCandidates() {
  const candidates = [
    {
      label: "service-role",
      key: getOptionalEnvValue(["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]),
    },
    {
      label: "anon",
      key: getOptionalEnvValue(["NEXT_PUBLIC_SUPABASE_ANON_KEY"]),
    },
    {
      label: "publishable",
      key: getOptionalEnvValue(["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]),
    },
  ].filter((entry) => entry.key);

  const seen = new Set();
  return candidates.filter((entry) => {
    if (seen.has(entry.key)) {
      return false;
    }
    seen.add(entry.key);
    return true;
  });
}

async function main() {
  const supabaseUrl = getRequiredEnvValue(
    ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"],
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL",
  );
  const keyCandidates = buildKeyCandidates();

  if (keyCandidates.length === 0) {
    throw new Error(
      "Missing Supabase API key env vars. Provide one of SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  let lastError = null;

  for (const candidate of keyCandidates) {
    try {
      const restResult = await checkRestApi(supabaseUrl, candidate.key);
      console.log(`[supabase] REST API reachable with ${candidate.label} key (status ${restResult.status})`);

      const supabase = createClient(supabaseUrl, candidate.key, {
        auth: { persistSession: false },
      });

      const queryResult = await checkDbQuery(supabase);
      console.log(`[supabase] DB query succeeded in ${queryResult.durationMs}ms (v_external_events_public rows: ${queryResult.count ?? "unknown"})`);
      console.log("[supabase] Connection test passed");
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[supabase] ${candidate.label} key failed: ${message}`);
    }
  }

  throw lastError ?? new Error("Supabase connection test failed for all key candidates");
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[supabase] Connection test failed: ${message}`);
  process.exit(1);
});
