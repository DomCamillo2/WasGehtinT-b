import { readFileSync } from "node:fs";

const API_BASE = "https://api.cron-job.org";
const DEFAULT_TITLE = "WasGehtTueb External Events Refresh";

function parseDotEnv(content) {
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
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
    const hasUtf16NullBytes = dotenvBuffer.length > 2
      && dotenvBuffer[1] === 0
      && dotenvBuffer[3] === 0;
    const dotenvContent = hasUtf16NullBytes
      ? dotenvBuffer.toString("utf16le")
      : dotenvBuffer.toString("utf8");
    const parsed = parseDotEnv(dotenvContent);

    for (const name of names) {
      const value = parsed[name];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    const normalizedNameMap = new Map(
      Object.keys(parsed).map((key) => [key.replace(/[^a-z0-9]/gi, "").toLowerCase(), key]),
    );

    for (const name of names) {
      const normalized = name.replace(/[^a-z0-9]/gi, "").toLowerCase();
      const matchingKey = normalizedNameMap.get(normalized);
      if (matchingKey) {
        const value = parsed[matchingKey];
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
    }

    const rawCronApiKeyLine = dotenvContent
      .split(/\r?\n/)
      .find((line) => /cron/i.test(line) && /api/i.test(line) && /key/i.test(line) && line.includes("="));

    if (rawCronApiKeyLine) {
      const valuePart = rawCronApiKeyLine.slice(rawCronApiKeyLine.indexOf("=") + 1).trim();
      const unquoted = (
        (valuePart.startsWith('"') && valuePart.endsWith('"'))
        || (valuePart.startsWith("'") && valuePart.endsWith("'"))
      )
        ? valuePart.slice(1, -1)
        : valuePart;

      if (unquoted) {
        return unquoted;
      }
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
    if (value) {
      return value;
    }
  }

  const dotenvValue = getEnvFromDotEnvFile(names);
  if (dotenvValue) {
    return dotenvValue;
  }

  throw new Error(errorMessage);
}

function getTargetUrl() {
  const appBaseUrl = getRequiredEnvValue(
    ["APP_BASE_URL", "NEXT_PUBLIC_APP_URL"],
    "Missing APP_BASE_URL or NEXT_PUBLIC_APP_URL",
  );

  return `${appBaseUrl.replace(/\/$/, "")}/api/external-events/refresh`;
}

function buildJobPayload(targetUrl, cronSecret) {
  const title = getEnv("CRON_JOB_TITLE") || DEFAULT_TITLE;
  const timezone = getEnv("CRON_JOB_TIMEZONE") || "Europe/Berlin";

  const minutes = (getEnv("CRON_JOB_MINUTES") || "0")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 59);

  const hours = (getEnv("CRON_JOB_HOURS") || "0,6,12,18")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 23);

  if (minutes.length === 0) {
    throw new Error("Invalid CRON_JOB_MINUTES value; expected comma-separated integers 0-59");
  }

  if (hours.length === 0) {
    throw new Error("Invalid CRON_JOB_HOURS value; expected comma-separated integers 0-23");
  }

  return {
    job: {
      enabled: true,
      title,
      saveResponses: true,
      url: targetUrl,
      requestTimeout: 60,
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
    throw new Error(`cron-job.org ${method} ${path} failed (${response.status}): ${JSON.stringify(parsedBody)}`);
  }

  return parsedBody;
}

function findExistingJob(jobs, { explicitJobId, title, targetUrl }) {
  if (explicitJobId) {
    return jobs.find((job) => Number(job.jobId) === explicitJobId) || null;
  }

  return jobs.find((job) => job.title === title || job.url === targetUrl) || null;
}

async function main() {
  const cronApiKey = getRequiredEnvValue(
    ["CRON_JOB_API_KEY", "Cron-job_API_KEY", "CRONJOB_API_KEY"],
    "Missing CRON_JOB_API_KEY (or Cron-job_API_KEY) environment variable",
  );
  const cronSecret = getRequiredEnvValue(["CRON_SECRET"], "Missing CRON_SECRET environment variable");

  const targetUrl = getTargetUrl();
  const jobPayload = buildJobPayload(targetUrl, cronSecret);
  const explicitJobId = Number(getEnv("CRON_JOB_ID") || "");

  const jobsList = await apiRequest("/jobs", { apiKey: cronApiKey });
  const jobs = Array.isArray(jobsList?.jobs) ? jobsList.jobs : [];

  const existingJob = findExistingJob(jobs, {
    explicitJobId: Number.isInteger(explicitJobId) ? explicitJobId : null,
    title: jobPayload.job.title,
    targetUrl,
  });

  let jobId;

  if (existingJob) {
    jobId = Number(existingJob.jobId);
    await apiRequest(`/jobs/${jobId}`, {
      method: "PATCH",
      apiKey: cronApiKey,
      payload: jobPayload,
    });
    console.log(`[cronjob] Updated job ${jobId} (${jobPayload.job.title})`);
  } else {
    const created = await apiRequest("/jobs", {
      method: "PUT",
      apiKey: cronApiKey,
      payload: jobPayload,
    });
    jobId = Number(created?.jobId);
    if (!Number.isInteger(jobId)) {
      throw new Error(`Unexpected create response: ${JSON.stringify(created)}`);
    }
    console.log(`[cronjob] Created job ${jobId} (${jobPayload.job.title})`);
  }

  const details = await apiRequest(`/jobs/${jobId}`, { apiKey: cronApiKey });
  const jobDetails = details?.jobDetails ?? {};

  console.log(`[cronjob] Enabled: ${String(jobDetails.enabled)}`);
  console.log(`[cronjob] URL: ${jobDetails.url}`);
  console.log(`[cronjob] Method: ${jobDetails.requestMethod === 1 ? "POST" : String(jobDetails.requestMethod)}`);
  console.log(`[cronjob] Next execution (unix): ${jobDetails.nextExecution ?? "n/a"}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[cronjob] Setup failed: ${message}`);
  process.exit(1);
});
