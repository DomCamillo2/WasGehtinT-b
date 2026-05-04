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
