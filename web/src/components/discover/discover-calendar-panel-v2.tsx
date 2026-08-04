"use client";

import { useMemo } from "react";
import {
  BERLIN_CALENDAR_HEADING,
  BERLIN_DAY_CHIP_ARIA,
  berlinDayKeyFromIso,
  buildCalendarMonthGrid,
  endOfIsoMonth,
  isoDatesInSameMonth,
  shiftIsoMonth,
  startOfIsoMonth,
} from "@/lib/discover-calendar";
import type { DiscoverEvent } from "@/services/discover/discover-view-model";
import { DiscoverEventListItemV2 } from "./discover-event-list-item-v2";

type Props = {
  events: DiscoverEvent[];
  todayKey: string;
  selectedDate: string;
  onSelectedDateChange: (iso: string) => void;
  monthAnchor: string;
  onMonthAnchorChange: (iso: string) => void;
  hotPartyIds: Set<string>;
  upvoteCounts: Record<string, number>;
  upvotedPartyIds: string[];
  formatEventDate: (iso: string) => string;
  formatEventTime: (iso: string) => string;
  venueLabel: (event: DiscoverEvent) => string;
  onUpvote: (eventId: string) => void;
};

function pickDateForMonth(
  monthIso: string,
  todayKey: string,
  selectedDate: string,
  counts: Map<string, number>,
): string {
  const monthStart = startOfIsoMonth(monthIso);
  if (isoDatesInSameMonth(selectedDate, monthStart)) return selectedDate;
  if (isoDatesInSameMonth(todayKey, monthStart)) return todayKey;

  let firstWithEvents: string | null = null;
  for (const [day, count] of counts) {
    if (count > 0 && isoDatesInSameMonth(day, monthStart)) {
      if (!firstWithEvents || day < firstWithEvents) firstWithEvents = day;
    }
  }
  return firstWithEvents ?? monthStart;
}

export function DiscoverCalendarPanelV2({
  events,
  todayKey,
  selectedDate,
  onSelectedDateChange,
  monthAnchor,
  onMonthAnchorChange,
  hotPartyIds,
  upvoteCounts,
  upvotedPartyIds,
  formatEventDate,
  formatEventTime,
  venueLabel,
  onUpvote,
}: Props) {
  const monthStart = startOfIsoMonth(monthAnchor || todayKey);
  const grid = useMemo(() => buildCalendarMonthGrid(monthStart, todayKey), [monthStart, todayKey]);

  const eventCountByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of events) {
      const key = berlinDayKeyFromIso(event.startsAt);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const dayEvents = useMemo(() => {
    return events
      .filter((e) => berlinDayKeyFromIso(e.startsAt) === selectedDate)
      .slice()
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [events, selectedDate]);

  const heading = useMemo(() => {
    return BERLIN_CALENDAR_HEADING.format(new Date(`${selectedDate}T12:00:00Z`));
  }, [selectedDate]);

  const goToMonth = (delta: number) => {
    const nextMonth = startOfIsoMonth(shiftIsoMonth(monthStart, delta));
    onMonthAnchorChange(nextMonth);
    onSelectedDateChange(pickDateForMonth(nextMonth, todayKey, selectedDate, eventCountByDay));
  };

  const coverageHint = useMemo(() => {
    const monthEnd = endOfIsoMonth(monthStart);
    const hasAnyInMonth = [...eventCountByDay.keys()].some((d) => isoDatesInSameMonth(d, monthStart));
    if (hasAnyInMonth) return null;
    if (monthEnd < todayKey) {
      return "Vergangene Tage liegen außerhalb des Discover-Fensters.";
    }
    return "Für diesen Monat sind noch keine Events geladen — ggf. weiter voraus scrollen oder Wochen erweitern.";
  }, [eventCountByDay, monthStart, todayKey]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-card)] p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            className="grid h-10 w-10 place-items-center rounded-md border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] text-[color:var(--foreground)] hover:border-[color:var(--border-strong)]"
            aria-label="Vorheriger Monat"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <p className="text-sm font-semibold capitalize text-[color:var(--foreground)]">{grid.monthLabel}</p>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            className="grid h-10 w-10 place-items-center rounded-md border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] text-[color:var(--foreground)] hover:border-[color:var(--border-strong)]"
            aria-label="Nächster Monat"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
          {"Mo Di Mi Do Fr Sa So".split(" ").map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Monatskalender">
          {grid.cells.map((cell, index) => {
            if (!cell.isoDate || !cell.day) {
              return <div key={`cal-empty-${index}`} className="h-10" role="presentation" />;
            }

            const count = eventCountByDay.get(cell.isoDate) ?? 0;
            const active = selectedDate === cell.isoDate;
            const isToday = todayKey === cell.isoDate;
            const isPast = cell.isoDate < todayKey;

            return (
              <button
                key={cell.isoDate}
                type="button"
                role="gridcell"
                aria-selected={active}
                aria-current={isToday ? "date" : undefined}
                onClick={() => {
                  onSelectedDateChange(cell.isoDate!);
                  onMonthAnchorChange(startOfIsoMonth(cell.isoDate!));
                }}
                className={`relative flex h-10 flex-col items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[color:var(--accent)] text-[color:var(--primary-foreground)]"
                    : isToday
                      ? "border border-[color:var(--accent)]/70 bg-[color:var(--surface-elevated)] text-[color:var(--foreground)]"
                      : isPast
                        ? "border border-[color:var(--border-soft)] bg-[color:var(--surface-card)] text-[color:var(--muted-foreground)] hover:border-[color:var(--border-soft)]"
                        : "border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] text-[color:var(--foreground)] hover:border-[color:var(--border-strong)]"
                }`}
                aria-label={`${BERLIN_DAY_CHIP_ARIA.format(new Date(`${cell.isoDate}T12:00:00Z`))}${
                  count > 0 ? `, ${count} Events` : ""
                }`}
              >
                <span className="leading-none">{cell.day}</span>
                {count > 0 ? (
                  <span
                    className={`mt-0.5 h-1 w-1 rounded-full ${active ? "bg-[color:var(--primary-foreground)]" : "bg-[color:var(--accent)]"}`}
                    aria-hidden="true"
                  />
                ) : (
                  <span className="mt-0.5 h-1 w-1" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            onSelectedDateChange(todayKey);
            onMonthAnchorChange(startOfIsoMonth(todayKey));
          }}
          className="mt-3 h-10 w-full rounded-md border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] text-xs font-semibold text-[color:var(--foreground)] hover:border-[color:var(--accent)]/45"
        >
          Heute
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Events am {heading}
          </p>
          {dayEvents.length > 0 ? (
            <p className="text-[11px] tabular-nums text-[color:var(--muted-foreground)]">{dayEvents.length}</p>
          ) : null}
        </div>

        {dayEvents.length > 0 ? (
          <div className="space-y-2">
            {dayEvents.map((event) => (
              <DiscoverEventListItemV2
                key={event.id}
                event={event}
                isHot={hotPartyIds.has(event.id)}
                upvoteCount={upvoteCounts[event.id] ?? event.upvoteCount ?? 0}
                upvotedByMe={upvotedPartyIds.includes(event.id)}
                dateLabel={formatEventDate(event.startsAt)}
                timeLabel={formatEventTime(event.startsAt)}
                venueLabel={venueLabel(event)}
                onUpvote={() => onUpvote(event.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-card)] p-4 text-sm text-[color:var(--muted-foreground)]">
            <p>Keine Events für diesen Tag in der aktuellen Auswahl.</p>
            {coverageHint ? <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">{coverageHint}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
