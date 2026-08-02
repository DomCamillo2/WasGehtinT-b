/** Calendar day key (YYYY-MM-DD) for an instant in Europe/Berlin. */
export function berlinDayKeyFromDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Parse schema.org / JSON-LD startDate / endDate strings.
 * Offset-less datetimes are treated as Europe/Berlin wall clock (not UTC).
 */
export function parseSchemaOrgDateTime(value: string): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  // Explicit timezone: Z or ±HH:MM / ±HHMM
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(raw)) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const dateTime = raw.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/,
  );
  if (dateTime) {
    const [, isoDate, hour, minute] = dateTime;
    const date = berlinWallTimeToUtc(isoDate, Number(hour), Number(minute));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly) {
    const date = berlinWallTimeToUtc(dateOnly[1], 12, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Convert a calendar date (YYYY-MM-DD) + wall-clock time interpreted in Europe/Berlin
 * to the corresponding UTC instant.
 */
export function berlinWallTimeToUtc(isoDate: string, hour: number, minute: number): Date {
  const [y, mon, d] = isoDate.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mon) || !Number.isFinite(d)) {
    return new Date(NaN);
  }

  let t = Date.UTC(y, mon - 1, d, hour - 1, minute, 0);

  for (let i = 0; i < 24; i += 1) {
    const dt = new Date(t);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(dt);

    const py = Number(parts.find((p) => p.type === "year")?.value);
    const pm = Number(parts.find((p) => p.type === "month")?.value);
    const pd = Number(parts.find((p) => p.type === "day")?.value);
    const ph = Number(parts.find((p) => p.type === "hour")?.value);
    const pmin = Number(parts.find((p) => p.type === "minute")?.value);

    if (py === y && pm === mon && pd === d && ph === hour && pmin === minute) {
      return dt;
    }

    const diffMin = hour * 60 + minute - (ph * 60 + pmin);
    t += diffMin * 60 * 1000;
  }

  return new Date(t);
}

function berlinCalendarYear(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  return Number.isFinite(year) ? year : now.getUTCFullYear();
}

export type YearlessDateOptions = {
  /** How far in the past a date may sit before we try year+1 (ms). */
  maxPastMs?: number;
  /**
   * Reject dates further than this into the future (ms).
   * Prevents stale July programs becoming July next-year nightlife ghosts.
   */
  maxFutureMs?: number;
};

/**
 * Resolve yearless day/month wall times in Europe/Berlin.
 * Year-bumps only when still within maxFutureMs — otherwise returns null (stale listing).
 */
export function resolveYearlessBerlinDate(
  day: number,
  month: number,
  hour: number,
  minute: number,
  options: YearlessDateOptions = {},
): Date | null {
  if (!Number.isInteger(day) || !Number.isInteger(month) || day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  const maxPastMs = options.maxPastMs ?? 2 * 24 * 60 * 60 * 1000;
  const maxFutureMs = options.maxFutureMs ?? 120 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  const year = berlinCalendarYear();
  const pad = (n: number) => String(n).padStart(2, "0");

  let candidate = berlinWallTimeToUtc(`${year}-${pad(month)}-${pad(day)}`, hour, minute);
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }

  if (candidate.getTime() < nowMs - maxPastMs) {
    candidate = berlinWallTimeToUtc(`${year + 1}-${pad(month)}-${pad(day)}`, hour, minute);
  }

  if (Number.isNaN(candidate.getTime())) {
    return null;
  }

  if (candidate.getTime() < nowMs - maxPastMs) {
    return null;
  }

  if (candidate.getTime() > nowMs + maxFutureMs) {
    return null;
  }

  return candidate;
}
