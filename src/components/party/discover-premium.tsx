"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  Map as MapIcon,
} from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { DiscoverMap } from "@/components/party/discover-map";
import { PartyCard as PartyCardType } from "@/lib/types";

type FilterKey = "all" | "wg" | "clubs" | "today";
type ViewKey = "list" | "map" | "calendar";

type Props = {
  parties: PartyCardType[];
  avatarFallback: string;
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

function toDateKeyBerlin(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date(iso));
}

function parseGermanDateToIso(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const match = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function formatIsoToGerman(value: string | null): string {
  if (!value) {
    return "";
  }

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!year || !month || !day) {
    return "";
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function shiftIsoMonth(isoDate: string, monthDelta: number): string {
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


export function DiscoverPremium({ parties, avatarFallback }: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [view, setView] = useState<ViewKey>("list");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [fromDateInput, setFromDateInput] = useState("");
  const [toDateInput, setToDateInput] = useState("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const fromDate = useMemo(() => parseGermanDateToIso(fromDateInput), [fromDateInput]);
  const toDate = useMemo(() => parseGermanDateToIso(toDateInput), [toDateInput]);
  const fromDateGerman = useMemo(() => formatIsoToGerman(fromDate), [fromDate]);
  const toDateGerman = useMemo(() => formatIsoToGerman(toDate), [toDate]);

  const todayKey = useMemo(
    () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date()),
    [],
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayKey);

  const filteredParties = useMemo(() => {
    const sorted = [...parties].sort(
      (left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
    );

    return sorted.filter((party) => {
      const dateKey = toDateKeyBerlin(party.starts_at);

      if (filter === "wg") {
        if (party.is_external) return false;
      }

      if (filter === "clubs") {
        if (!party.is_external) return false;
      }

      if (filter === "today") {
        if (dateKey !== todayKey) return false;
      }

      if (fromDate && dateKey < fromDate) {
        return false;
      }

      if (toDate && dateKey > toDate) {
        return false;
      }

      return true;
    });
  }, [filter, fromDate, parties, toDate, todayKey]);

  const filterItems: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: "Alle" },
    { key: "wg", label: "🏠 WGs" },
    { key: "clubs", label: "🪩 Clubs" },
    { key: "today", label: "🔥 Heute" },
  ];

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PartyCardType[]>();
    for (const party of filteredParties) {
      const key = toDateKeyBerlin(party.starts_at);
      const list = map.get(key) ?? [];
      list.push(party);
      map.set(key, list);
    }
    return map;
  }, [filteredParties]);

  const calendarMeta = useMemo(() => {
    const [yearRaw, monthRaw] = selectedCalendarDate.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const monthStart = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
    const firstWeekday = (monthStart.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();

    const cells: Array<{ isoDate: string | null; day: number | null }> = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ isoDate: null, day: null });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      const isoDate = `${year}-${mm}-${dd}`;
      cells.push({ isoDate, day });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ isoDate: null, day: null });
    }

    const monthLabel = new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      month: "long",
      year: "numeric",
    }).format(monthStart);

    return { monthLabel, cells };
  }, [selectedCalendarDate]);

  const selectedCalendarEvents = useMemo(
    () => eventsByDate.get(selectedCalendarDate) ?? [],
    [eventsByDate, selectedCalendarDate],
  );

  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-center justify-between px-1 pt-1">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900">Entdecken</h1>
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-sm font-bold text-zinc-700 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
          type="button"
        >
          {avatarFallback}
        </motion.button>
      </header>

      <LayoutGroup>
        <div className="hide-scrollbar flex gap-2 overflow-x-auto px-1 py-1">
          {filterItems.map((item) => {
            const active = item.key === filter;
            return (
              <motion.button
                key={item.key}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setFilter(item.key)}
                className="relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold"
              >
                {active ? (
                  <motion.span
                    layoutId="discover-filter-chip"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md"
                  />
                ) : null}
                <span className={`relative z-10 ${active ? "text-white" : "text-zinc-600"}`}>{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowAdvancedFilters((current) => !current)}
        className="mx-1 flex h-9 w-[calc(100%-0.5rem)] items-center justify-between rounded-xl bg-white px-3 text-xs font-semibold text-zinc-600 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
      >
        <span>Erweitert</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`}
        />
      </motion.button>

      <LayoutGroup>
        <div className="grid grid-cols-3 gap-2 px-1">
          {[
            { key: "list", label: "Liste", icon: List },
            { key: "map", label: "Map", icon: MapIcon },
            { key: "calendar", label: "Kalender", icon: CalendarDays },
          ].map((item) => {
            const active = item.key === view;
            const Icon = item.icon;
            return (
              <motion.button
                key={item.key}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => setView(item.key as ViewKey)}
                className="relative flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold"
              >
                {active ? (
                  <motion.span
                    layoutId="discover-view-chip"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-2xl bg-zinc-900"
                  />
                ) : null}
                <Icon size={16} className={`relative z-10 ${active ? "text-white" : "text-zinc-500"}`} />
                <span className={`relative z-10 ${active ? "text-white" : "text-zinc-600"}`}>{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>

      <AnimatePresence initial={false}>
        {showAdvancedFilters ? (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-2xl bg-white p-2 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
              <input
                type="date"
                lang="de-DE"
                placeholder="Von"
                value={fromDateInput}
                onChange={(event) => setFromDateInput(event.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none focus:border-indigo-400"
                aria-label="Startdatum"
              />
              <input
                type="date"
                lang="de-DE"
                placeholder="Bis"
                value={toDateInput}
                onChange={(event) => setToDateInput(event.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none focus:border-indigo-400"
                aria-label="Enddatum"
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => {
                  setFromDateInput("");
                  setToDateInput("");
                }}
                className="h-10 rounded-xl bg-zinc-900 px-3 text-xs font-semibold text-white"
              >
                Reset
              </motion.button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {fromDateGerman || toDateGerman ? (
        <p className="px-2 text-xs text-zinc-500">
          Zeitraum: {fromDateGerman || "..."} – {toDateGerman || "..."}
        </p>
      ) : null}

      <AnimatePresence mode="wait">
        {view === "map" ? (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <DiscoverMap parties={filteredParties} />
          </motion.div>
        ) : view === "calendar" ? (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="rounded-3xl bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCalendarDate((current) => shiftIsoMonth(current, -1))}
                    className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200"
                    aria-label="Vorheriger Monat"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <p className="min-w-[140px] text-center text-sm font-semibold capitalize text-zinc-900">
                    {calendarMeta.monthLabel}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedCalendarDate((current) => shiftIsoMonth(current, 1))}
                    className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200"
                    aria-label="Nächster Monat"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCalendarDate(todayKey)}
                  className="rounded-xl bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700"
                >
                  Heute
                </button>
              </div>

              <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                {"Mo Di Mi Do Fr Sa So".split(" ").map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarMeta.cells.map((cell, index) => {
                  if (!cell.isoDate || !cell.day) {
                    return <div key={`empty-${index}`} className="h-10" />;
                  }

                  const isSelected = cell.isoDate === selectedCalendarDate;
                  const isToday = cell.isoDate === todayKey;
                  const eventCount = eventsByDate.get(cell.isoDate)?.length ?? 0;

                  return (
                    <button
                      key={cell.isoDate}
                      type="button"
                      onClick={() => setSelectedCalendarDate(cell.isoDate!)}
                      className={`relative h-10 rounded-xl text-sm font-semibold transition ${
                        isSelected
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                          : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      {cell.day}
                      {eventCount > 0 ? (
                        <span
                          className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                            isSelected ? "bg-white" : isToday ? "bg-red-500" : "bg-indigo-500"
                          }`}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Events am {new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${selectedCalendarDate}T12:00:00Z`))}
              </p>

              {selectedCalendarEvents.length ? (
                selectedCalendarEvents.map((party) => {
                  return (
                    <EventCard
                      key={party.id}
                      party={party}
                      expanded={expandedCardId === party.id}
                      onToggle={() =>
                        setExpandedCardId((current) => (current === party.id ? null : party.id))
                      }
                    />
                  );
                })
              ) : (
                <div className="rounded-2xl bg-white p-4 text-sm text-zinc-500 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
                  Keine Events für diesen Tag.
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            variants={listVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-3"
          >
            {filteredParties.map((party) => (
              <motion.div key={party.id} variants={itemVariants}>
                <EventCard
                key={party.id}
                  party={party}
                  expanded={expandedCardId === party.id}
                  onToggle={() =>
                    setExpandedCardId((current) => (current === party.id ? null : party.id))
                  }
                />
              </motion.div>
            ))}

            {!filteredParties.length ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-white p-4 text-sm text-zinc-500 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
              >
                Für den aktiven Filter sind aktuell keine Events verfügbar.
              </motion.div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
