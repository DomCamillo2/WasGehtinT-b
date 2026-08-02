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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string | null | undefined): value is string {
  return typeof value === "string" && ISO_DATE_RE.test(value);
}

export function berlinDayKeyFromIso(iso: string): string {
  return BERLIN_DAY_KEY.format(new Date(iso));
}

/** Normalize any YYYY-MM-DD to the first day of that month. */
export function startOfIsoMonth(isoDate: string): string {
  if (!isIsoDate(isoDate)) return isoDate;
  return `${isoDate.slice(0, 7)}-01`;
}

/** Last civil day of the month for YYYY-MM-DD. */
export function endOfIsoMonth(isoDate: string): string {
  if (!isIsoDate(isoDate)) return isoDate;
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function isoDatesInSameMonth(a: string, b: string): boolean {
  return isIsoDate(a) && isIsoDate(b) && a.slice(0, 7) === b.slice(0, 7);
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

/**
 * How many whole weeks from `now` are needed to include `isoDate` (end of that civil day, UTC noon proxy).
 * Used to expand the Discover fetch window when the calendar navigates past the loaded range.
 */
export function weeksNeededToCoverIsoDate(isoDate: string, now = new Date()): number {
  if (!isIsoDate(isoDate)) return 0;
  const target = new Date(`${isoDate}T23:59:59.000Z`);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));
}

export function buildCalendarMonthGrid(calendarMonthDate: string, todayFallback: string): CalendarMonthGrid {
  const normalizedMonth = isIsoDate(calendarMonthDate) ? calendarMonthDate : todayFallback;
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
