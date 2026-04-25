import { readFileSync } from "node:fs";

const API_BASE = "https://api.cron-job.org";

function parseDotEnv(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function getEnvFromDotEnvFile(names) {
  const dotenvPath = getEnv("DOTENV_PATH") || ".env.local";
  try {
    const dotenvBuffer = readFileSync(dotenvPath);
    const hasUtf16NullBytes =
      dotenvBuffer.length > 2 && dotenvBuffer[1] === 0 && dotenvBuffer[3] === 0;
    const dotenvContent = hasUtf16NullBytes
      ? dotenvBuffer.toString("utf16le")
      : dotenvBuffer.toString("utf8");
    const parsed = parseDotEnv(dotenvContent);

    for (const name of names) {
      const value = parsed[name];
      if (typeof value === "string" && value.trim()) return value.trim();
    }

    const normalizedNameMap = new Map(
      Object.keys(parsed).map((key) => [
        key.replace(/[^a-z0-9]/gi, "").toLowerCase(),
        key,
      ]),
    );
    for (const name of names) {
      const normalized = name.replace(/[^a-z0-9]/gi, "").toLowerCase();
      const matchingKey = normalizedNameMap.get(normalized);
      if (matchingKey) {
        const value = parsed[matchingKey];
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    }

    const rawCronApiKeyLine = dotenvContent
      .split(/\r?\n/)
      .find(
        (line) =>
          /cron/i.test(line) &&
          /api/i.test(line) &&
          /key/i.test(line) &&
          line.includes("="),
      );
    if (rawCronApiKeyLine) {
      const valuePart = rawCronApiKeyLine
        .slice(rawCronApiKeyLine.indexOf("=") + 1)
        .trim();
      const unquoted =
        (valuePart.startsWith('"') && valuePart.endsWith('"')) ||
        (valuePart.startsWith("'") && valuePart.endsWith("'"))
          ? valuePart.slice(1, -1)
          : valuePart;
      if (unquoted) return unquoted;
    }
  } catch {
    return "";
  }
  return "";
}

function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function getRequiredEnvValue(names, errorMessage) {
  for (const name of names) {
    const value = getEnv(name);
    if (value) return value;
  }
  const dotenvValue = getEnvFromDotEnvFile(names);
  if (dotenvValue) return dotenvValue;
  throw new Error(errorMessage);
}

function getAppBaseUrl() {
  return getRequiredEnvValue(
    ["APP_BASE_URL", "NEXT_PUBLIC_APP_URL"],
    "Missing APP_BASE_URL or NEXT_PUBLIC_APP_URL",
  );
}

function buildJobPayload({ title, targetUrl, cronSecret, hours, minutes, timezone }) {
  return {
    job: {
      enabled: true,
      title,
      saveResponses: true,
      url: targetUrl,
      requestTimeout: 90,
      requestMethod: 1,
      redirectSuccess: false,
      schedule: {
        timezone,
        expiresAt: 0,
        hours,
        mdays: [-1],
        minutes,
        months: [-1],
        wdays: [-1],
      },
      notification: {
        onFailure: true,
        onFailureCount: 2,
        onSuccess: false,
        onDisable: true,
      },
      extendedData: {
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          Accept: "application/json",
        },
      },
    },
  };
}

async function apiRequest(path, { method = "GET", apiKey, payload } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const rawBody = await response.text();
  let parsedBody = null;
  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = { rawBody };
    }
  }

  if (!response.ok) {
    throw new Error(
      `cron-job.org ${method} ${path} failed (${response.status}): ${JSON.stringify(parsedBody)}`,
    );
  }
  return parsedBody;
}

function findExistingJob(jobs, { explicitJobId, title, targetUrl }) {
  if (explicitJobId) {
    return jobs.find((job) => Number(job.jobId) === explicitJobId) || null;
  }
  return jobs.find((job) => job.title === title || job.url === targetUrl) || null;
}

async function upsertJob(apiKey, jobsList, jobConfig) {
  const existingJob = findExistingJob(jobsList, {
    explicitJobId: null,
    title: jobConfig.job.title,
    targetUrl: jobConfig.job.url,
  });

  let jobId;
  if (existingJob) {
    jobId = Number(existingJob.jobId);
    await apiRequest(`/jobs/${jobId}`, {
      method: "PATCH",
      apiKey,
      payload: jobConfig,
    });
    console.log(`[cronjob] Updated job ${jobId} (${jobConfig.job.title})`);
  } else {
    const created = await apiRequest("/jobs", {
      method: "PUT",
      apiKey,
      payload: jobConfig,
    });
    jobId = Number(created?.jobId);
    if (!Number.isInteger(jobId)) {
      throw new Error(`Unexpected create response: ${JSON.stringify(created)}`);
    }
    console.log(`[cronjob] Created job ${jobId} (${jobConfig.job.title})`);
  }

  const details = await apiRequest(`/jobs/${jobId}`, { apiKey });
  const d = details?.jobDetails ?? {};
  console.log(`[cronjob]   Enabled: ${String(d.enabled)}`);
  console.log(`[cronjob]   URL: ${d.url}`);
  console.log(`[cronjob]   Next execution (unix): ${d.nextExecution ?? "n/a"}`);

  return jobId;
}

async function main() {
  const cronApiKey = getRequiredEnvValue(
    ["CRON_JOB_API_KEY", "Cron-job_API_KEY", "CRONJOB_API_KEY"],
    "Missing CRON_JOB_API_KEY environment variable",
  );
  const cronSecret = getRequiredEnvValue(
    ["CRON_SECRET"],
    "Missing CRON_SECRET environment variable",
  );
  const appBaseUrl = getAppBaseUrl().replace(/\/$/, "");
  const timezone = getEnv("CRON_JOB_TIMEZONE") || "Europe/Berlin";

  const jobs = [
    {
      // Free web scraping — run every 6 hours, no API cost.
      title: "WasGehtTueb External Events Refresh",
      targetUrl: `${appBaseUrl}/api/external-events/refresh`,
      hours: [0, 6, 12, 18],
      minutes: [0],
    },
    {
      // Apify costs ~$0.065/run → once daily keeps usage ~$2/month (within $5 free tier).
      title: "WasGehtTueb Instagram Scraper",
      targetUrl: `${appBaseUrl}/api/cron/scrape`,
      hours: [7],
      minutes: [0],
    },
  ];

  const jobsList = await apiRequest("/jobs", { apiKey: cronApiKey });
  const existingJobs = Array.isArray(jobsList?.jobs) ? jobsList.jobs : [];

  for (const job of jobs) {
    console.log(`\n[cronjob] --- ${job.title} ---`);
    const payload = buildJobPayload({
      title: job.title,
      targetUrl: job.targetUrl,
      cronSecret,
      hours: job.hours,
      minutes: job.minutes,
      timezone,
    });
    await upsertJob(cronApiKey, existingJobs, payload);
  }

  console.log("\n[cronjob] All jobs registered successfully.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[cronjob] Setup failed: ${message}`);
  process.exit(1);
});
