/** Berlin calendar helpers shared by classic Discover and Discover V2. */

const BERLIN_DAY_KEY = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" });

const BERLIN_MONTH_LABEL = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  month: "long",
  year: "numeric",
});

export type CalendarMonthCell = { isoDate: string | null; day: number | null };

export type CalendarMonthGrid = {
  monthLabel: string;
  cells: CalendarMonthCell[];
};

export function berlinDayKeyFromIso(iso: string): string {
  return BERLIN_DAY_KEY.format(new Date(iso));
}

/** Add calendar days in Europe/Berlin (stable noon UTC stepping avoids DST edge cases). */
export function addBerlinDays(dayKey: string, deltaDays: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d, 12, 0, 0) + deltaDays * 86400000;
  return BERLIN_DAY_KEY.format(new Date(ms));
}

function berlinWeekdayShortMonSun(dayKey: string): string {
  const [y, mo, d] = dayKey.split("-").map(Number);
  const ms = Date.UTC(y, mo - 1, d, 12, 0, 0);
  return new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", weekday: "short" }).format(new Date(ms));
}

/** Monday (Berlin) of the ISO week containing `dayKey` (YYYY-MM-DD). */
export function berlinMondayOfWeekContaining(dayKey: string): string {
  let cur = dayKey;
  for (let i = 0; i < 7; i += 1) {
    const wd = berlinWeekdayShortMonSun(cur);
    if (wd === "Mon") return cur;
    cur = addBerlinDays(cur, -1);
  }
  return dayKey;
}

const WEEK_RANGE_LABEL = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "short",
});

function utcNoonFromDayKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export type DiscoverFeedSection = {
  /** Stable key for React lists / grouping */
  sectionKey: string;
  /** Heading shown above event cards */
  label: string;
};

/** Groups the Discover feed into “Diese Woche”, “Nächste Woche”, then calendar-week ranges (Berlin). */
export function discoverFeedSectionForEvent(eventIso: string, todayDayKey: string): DiscoverFeedSection {
  const eventDay = berlinDayKeyFromIso(eventIso);
  const eventWeekMon = berlinMondayOfWeekContaining(eventDay);
  const todayWeekMon = berlinMondayOfWeekContaining(todayDayKey);
  const nextWeekMon = addBerlinDays(todayWeekMon, 7);

  if (eventWeekMon === todayWeekMon) {
    return { sectionKey: `week:${eventWeekMon}`, label: "Diese Woche" };
  }
  if (eventWeekMon === nextWeekMon) {
    return { sectionKey: `week:${eventWeekMon}`, label: "Nächste Woche" };
  }

  const sunKey = addBerlinDays(eventWeekMon, 6);
  const label = `${WEEK_RANGE_LABEL.format(utcNoonFromDayKey(eventWeekMon))} – ${WEEK_RANGE_LABEL.format(utcNoonFromDayKey(sunKey))}`;
  return { sectionKey: `week:${eventWeekMon}`, label };
}

export function shiftIsoMonth(isoDate: string, monthDelta: number): string {
  const [yearRaw, monthRaw, dayRaw] = isoDate.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  const nextMonth = month - 1 + monthDelta;
  const nextYear = year + Math.floor(nextMonth / 12);
  const normalizedMonthIndex = ((nextMonth % 12) + 12) % 12;
  const maxDay = new Date(Date.UTC(nextYear, normalizedMonthIndex + 1, 0, 12, 0, 0)).getUTCDate();
  const clampedDay = Math.min(day, maxDay);

  const mm = String(normalizedMonthIndex + 1).padStart(2, "0");
  const dd = String(clampedDay).padStart(2, "0");
  return `${nextYear}-${mm}-${dd}`;
}

export function buildCalendarMonthGrid(calendarMonthDate: string, todayFallback: string): CalendarMonthGrid {
  const normalizedMonth = /^\d{4}-\d{2}-\d{2}$/.test(calendarMonthDate) ? calendarMonthDate : todayFallback;
  const [yearRaw, monthRaw] = normalizedMonth.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const firstWeekday = (monthStart.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();

  const cells: CalendarMonthCell[] = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ isoDate: null, day: null });
  }

  for (let d = 1; d <= daysInMonth; d += 1) {
    const mm = String(month).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push({ isoDate: `${year}-${mm}-${dd}`, day: d });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ isoDate: null, day: null });
  }

  return {
    monthLabel: BERLIN_MONTH_LABEL.format(monthStart),
    cells,
  };
}

export const BERLIN_CALENDAR_HEADING = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "long",
  day: "2-digit",
  month: "long",
});

export const BERLIN_DAY_CHIP_ARIA = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});
