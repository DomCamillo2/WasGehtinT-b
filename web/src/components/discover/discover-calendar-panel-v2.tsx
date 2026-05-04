"use client";

import { useMemo } from "react";
import {
  BERLIN_CALENDAR_HEADING,
  BERLIN_DAY_CHIP_ARIA,
  berlinDayKeyFromIso,
  buildCalendarMonthGrid,
  shiftIsoMonth,
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
  const grid = useMemo(() => buildCalendarMonthGrid(monthAnchor, todayKey), [monthAnchor, todayKey]);

  const dayEvents = useMemo(() => {
    return events.filter((e) => berlinDayKeyFromIso(e.startsAt) === selectedDate);
  }, [events, selectedDate]);

  const heading = useMemo(() => {
    return BERLIN_CALENDAR_HEADING.format(new Date(`${selectedDate}T12:00:00Z`));
  }, [selectedDate]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#2a221d] bg-[#17120f] p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              const next = shiftIsoMonth(monthAnchor || todayKey, -1);
              onMonthAnchorChange(next);
              onSelectedDateChange(next);
            }}
            className="grid h-9 w-9 place-items-center rounded-lg bg-[#1d1713] border border-[#2a221d] text-[#f2ece6] hover:bg-[#241d19]"
            aria-label="Vorheriger Monat"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <p className="text-sm font-semibold capitalize text-[#f2ece6]">{grid.monthLabel}</p>
          <button
            type="button"
            onClick={() => {
              const next = shiftIsoMonth(monthAnchor || todayKey, 1);
              onMonthAnchorChange(next);
              onSelectedDateChange(next);
            }}
            className="grid h-9 w-9 place-items-center rounded-lg bg-[#1d1713] border border-[#2a221d] text-[#f2ece6] hover:bg-[#241d19]"
            aria-label="Nächster Monat"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wide text-[#a89b90]">
          {"Mo Di Mi Do Fr Sa So".split(" ").map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.cells.map((cell, index) => {
            if (!cell.isoDate || !cell.day) {
              return <div key={`cal-empty-${index}`} className="h-9" />;
            }

            const hasEvents = events.some((p) => berlinDayKeyFromIso(p.startsAt) === cell.isoDate);
            const active = selectedDate === cell.isoDate;

            return (
              <button
                key={cell.isoDate}
                type="button"
                onClick={() => {
                  onSelectedDateChange(cell.isoDate!);
                  onMonthAnchorChange(cell.isoDate!);
                }}
                className={`relative h-9 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[#ff7a18] text-[#2d1d10] shadow-[0_8px_24px_rgba(255,122,24,0.35)]"
                    : "bg-[#1d1713] border border-[#2a221d] text-[#f2ece6] hover:bg-[#241d19]"
                }`}
                aria-label={BERLIN_DAY_CHIP_ARIA.format(new Date(`${cell.isoDate}T12:00:00Z`))}
              >
                {cell.day}
                {hasEvents ? (
                  <span
                    className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                      active ? "bg-[#2d1d10]" : "bg-[#ff7a18]"
                    }`}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            onSelectedDateChange(todayKey);
            onMonthAnchorChange(todayKey);
          }}
          className="mt-3 h-9 w-full rounded-xl border border-[#2a221d] bg-[#1d1713] text-xs font-semibold text-[#f2ece6] hover:border-[#ff7a18]/40 hover:bg-[#241d19]"
        >
          Heute
        </button>
      </div>

      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-[#a89b90]">Events am {heading}</p>

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
          <div className="rounded-2xl border border-[#2a221d] bg-[#17120f]/92 p-4 text-sm text-[#a89b90]">
            Keine Events für diesen Tag in der aktuellen Auswahl.
          </div>
        )}
      </div>
    </div>
  );
}
