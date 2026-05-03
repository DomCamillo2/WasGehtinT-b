const APP_BASE_URL = process.env.APP_BASE_URL?.trim();
const CRON_SECRET = process.env.CRON_SECRET?.trim();
const MAX_ATTEMPTS = Number(process.env.REFRESH_MAX_ATTEMPTS ?? "4");
const REQUEST_TIMEOUT_MS = Number(process.env.REFRESH_TIMEOUT_MS ?? "45000");

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getTargetUrl() {
  if (!APP_BASE_URL) {
    throw new Error("Missing APP_BASE_URL environment variable");
  }

  return `${APP_BASE_URL.replace(/\/$/, "")}/api/external-events/refresh`;
}

async function callRefresh(url) {
  if (!CRON_SECRET) {
    throw new Error("Missing CRON_SECRET environment variable");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const startedAt = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const durationMs = Date.now() - startedAt;
    const rawBody = await response.text();

    let parsedBody = null;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      parsedBody = { rawBody };
    }

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} after ${durationMs}ms: ${JSON.stringify(parsedBody)}`,
      );
    }

    if (!parsedBody || parsedBody.ok !== true) {
      throw new Error(`Unexpected response payload: ${JSON.stringify(parsedBody)}`);
    }

    return { durationMs, payload: parsedBody };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  const targetUrl = getTargetUrl();
  const attemptCount = Number.isFinite(MAX_ATTEMPTS) && MAX_ATTEMPTS > 0 ? MAX_ATTEMPTS : 4;

  for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
    try {
      console.log(`[refresh] Attempt ${attempt}/${attemptCount} -> ${targetUrl}`);
      const result = await callRefresh(targetUrl);
      console.log(
        `[refresh] Success in ${result.durationMs}ms | count=${result.payload.count ?? "n/a"} | refreshedAt=${result.payload.refreshedAt ?? "n/a"}`,
      );
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[refresh] Attempt ${attempt} failed: ${message}`);

      if (attempt >= attemptCount) {
        throw error;
      }

      const waitMs = Math.min(2000 * 2 ** (attempt - 1), 15000);
      console.log(`[refresh] Waiting ${waitMs}ms before retry`);
      await sleep(waitMs);
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[refresh] Failed permanently: ${message}`);
  process.exit(1);
});
