"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  Funnel,
  List,
  Map as MapIcon,
  X,
} from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { PartyCard as PartyCardType } from "@/lib/types";

const DiscoverMap = dynamic(
  () => import("@/components/party/discover-map").then((module) => module.DiscoverMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-56 w-full place-items-center rounded-2xl border border-zinc-200 bg-zinc-100 p-4 text-center text-sm text-zinc-600">
        Kartenansicht wird geladen...
      </div>
    ),
  },
);

type FilterKey = "all" | "wg" | "clubs" | "today" | "liked" | "top";
type ViewKey = "list" | "map" | "calendar";

type Props = {
  parties: PartyCardType[];
  avatarFallback: string;
  isAuthenticated: boolean;
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


export function DiscoverPremium({ parties, avatarFallback, isAuthenticated }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [view, setView] = useState<ViewKey>("list");
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [authSheetReason, setAuthSheetReason] = useState("Um mitzumachen, logge dich mit deiner Uni-Mail ein.");
  const [fromDateInput, setFromDateInput] = useState("");
  const [toDateInput, setToDateInput] = useState("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const initialUpvoteCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const party of parties) {
      map[party.id] = Math.max(0, Number(party.upvote_count ?? 0));
    }
    return map;
  }, [parties]);
  const initialUpvotedIds = useMemo(
    () => parties.filter((party) => party.upvoted_by_me).map((party) => party.id),
    [parties],
  );
  const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>(initialUpvoteCounts);
  const [upvotedPartyIds, setUpvotedPartyIds] = useState<string[]>(initialUpvotedIds);

  const fromDate = useMemo(() => parseGermanDateToIso(fromDateInput), [fromDateInput]);
  const toDate = useMemo(() => parseGermanDateToIso(toDateInput), [toDateInput]);
  const fromDateGerman = useMemo(() => formatIsoToGerman(fromDate), [fromDate]);
  const toDateGerman = useMemo(() => formatIsoToGerman(toDate), [toDate]);

  const todayKey = useMemo(
    () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date()),
    [],
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayKey);

  const sortedParties = useMemo(() => {
    return [...parties].sort((left, right) => {
      const leftScore = upvoteCounts[left.id] ?? left.upvote_count ?? 0;
      const rightScore = upvoteCounts[right.id] ?? right.upvote_count ?? 0;

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime();
    });
  }, [parties, upvoteCounts]);

  const topScore = useMemo(() => {
    let max = 0;
    for (const party of sortedParties) {
      if (party.is_external) {
        continue;
      }

      const score = upvoteCounts[party.id] ?? party.upvote_count ?? 0;
      if (score > max) {
        max = score;
      }
    }
    return max;
  }, [sortedParties, upvoteCounts]);

  const hotPartyIds = useMemo(() => {
    if (topScore <= 0) {
      return new Set<string>();
    }

    return new Set(
      sortedParties
        .filter((party) => !party.is_external)
        .filter((party) => (upvoteCounts[party.id] ?? party.upvote_count ?? 0) === topScore)
        .map((party) => party.id),
    );
  }, [sortedParties, topScore, upvoteCounts]);

  const rankByPartyId = useMemo(() => {
    const rankMap = new Map<string, number>();
    let rank = 1;

    for (const party of sortedParties) {
      if (party.is_external) {
        continue;
      }

      const score = upvoteCounts[party.id] ?? party.upvote_count ?? 0;
      if (score <= 0) {
        continue;
      }

      rankMap.set(party.id, rank);
      rank += 1;
    }

    return rankMap;
  }, [sortedParties, upvoteCounts]);

  const hottestParty = useMemo(
    () =>
      sortedParties.find(
        (party) => !party.is_external && (upvoteCounts[party.id] ?? party.upvote_count ?? 0) === topScore,
      ) ?? null,
    [sortedParties, topScore, upvoteCounts],
  );

  const filteredParties = useMemo(() => {
    const sorted = sortedParties;

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

      if (filter === "liked") {
        if (!upvotedPartyIds.includes(party.id)) return false;
      }

      if (filter === "top") {
        const score = upvoteCounts[party.id] ?? party.upvote_count ?? 0;
        if (score <= 0) return false;
      }

      if (fromDate && dateKey < fromDate) {
        return false;
      }

      if (toDate && dateKey > toDate) {
        return false;
      }

      return true;
    });
  }, [filter, fromDate, sortedParties, toDate, todayKey, upvoteCounts, upvotedPartyIds]);

  const filterItems: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: "Alle" },
    { key: "wg", label: "🏠 WGs" },
    { key: "clubs", label: "🪩 Clubs" },
    { key: "today", label: "🔥 Heute" },
    { key: "liked", label: "❤️ Gemerkt" },
    { key: "top", label: "🔥 Top Upvotes" },
  ];

  function requireAuth(reason: string) {
    if (isAuthenticated) {
      return true;
    }

    setAuthSheetReason(reason);
    setShowAuthSheet(true);
    return false;
  }

  async function toggleUpvote(eventId: string) {
    if (!requireAuth("Um Events zu pushen und den Hot Feed zu formen, logge dich mit deiner Uni-Mail ein.")) {
      return;
    }

    const wasUpvoted = upvotedPartyIds.includes(eventId);

    setUpvotedPartyIds((current) =>
      wasUpvoted ? current.filter((id) => id !== eventId) : [...current, eventId],
    );
    setUpvoteCounts((current) => ({
      ...current,
      [eventId]: Math.max(0, (current[eventId] ?? 0) + (wasUpvoted ? -1 : 1)),
    }));

    try {
      const response = await fetch(`/api/parties/${eventId}/upvote`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as { upvoted: boolean; upvoteCount: number };
      setUpvotedPartyIds((current) =>
        data.upvoted
          ? Array.from(new Set([...current, eventId]))
          : current.filter((id) => id !== eventId),
      );
      setUpvoteCounts((current) => ({
        ...current,
        [eventId]: Math.max(0, Number(data.upvoteCount ?? 0)),
      }));
    } catch {
      setUpvotedPartyIds((current) =>
        wasUpvoted ? Array.from(new Set([...current, eventId])) : current.filter((id) => id !== eventId),
      );
      setUpvoteCounts((current) => ({
        ...current,
        [eventId]: Math.max(0, (current[eventId] ?? 0) + (wasUpvoted ? 1 : -1)),
      }));
    }
  }

  function handleRequestAction() {
    if (!requireAuth("Um bei einer Party anzufragen und die genaue Location zu sehen, logge dich mit deiner Uni-Mail ein.")) {
      return;
    }

    router.push("/requests");
  }

  function handleChatAction() {
    if (!requireAuth("Um mit Hosts und Gästen zu chatten, logge dich mit deiner Uni-Mail ein.")) {
      return;
    }

    router.push("/chat");
  }

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
    <div className="relative space-y-4 pb-24">
      <header className="flex items-center justify-between px-1 pt-1">
        <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>Entdecken</h1>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => setShowFilterSheet(true)}
            className="grid h-10 w-10 place-items-center rounded-full border shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
            style={{
              borderColor: "var(--nav-border)",
              backgroundColor: "var(--surface-elevated)",
              color: "var(--foreground)",
            }}
            aria-label="Filter öffnen"
          >
            <Funnel size={16} />
          </motion.button>

          <motion.div whileTap={{ scale: 0.97 }} className="grid">
            {isAuthenticated ? (
              <Link
                href="/profile"
                className="grid h-10 w-10 place-items-center rounded-full bg-zinc-900 text-sm font-bold text-white shadow-[0_4px_16px_rgba(24,26,42,0.22)]"
                aria-label="Profil öffnen"
              >
                {avatarFallback}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthSheetReason("Um mitzumachen, logge dich mit deiner Uni-Mail ein.");
                  setShowAuthSheet(true);
                }}
                className="grid h-10 w-10 place-items-center rounded-full bg-zinc-900 text-sm font-bold text-white shadow-[0_4px_16px_rgba(24,26,42,0.22)]"
                aria-label="Login öffnen"
              >
                {avatarFallback}
              </button>
            )}
          </motion.div>
        </div>
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
                <span
                  className={`relative z-10 ${active ? "text-white" : ""}`}
                  style={active ? undefined : { color: "var(--muted-foreground)" }}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>

      <AnimatePresence initial={false}>
        {showFilterSheet ? (
          <>
            <motion.button
              type="button"
              aria-label="Filter schließen"
              className="fixed inset-0 z-30 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilterSheet(false)}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0.85 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.85 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md rounded-t-3xl border p-4 shadow-2xl"
              style={{
                borderColor: "var(--nav-border)",
                backgroundColor: "var(--surface-elevated)",
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Filter</p>
                <button
                  type="button"
                  onClick={() => setShowFilterSheet(false)}
                  className="grid h-8 w-8 place-items-center rounded-full"
                  style={{
                    backgroundColor: "var(--surface-soft)",
                    color: "var(--muted-foreground)",
                  }}
                  aria-label="Schließen"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  lang="de-DE"
                  placeholder="Von"
                  value={fromDateInput}
                  onChange={(event) => setFromDateInput(event.target.value)}
                  className="h-10 rounded-xl border px-3 text-sm outline-none focus:border-indigo-400"
                  style={{
                    borderColor: "var(--nav-border)",
                    backgroundColor: "var(--surface-soft)",
                    color: "var(--foreground)",
                  }}
                  aria-label="Startdatum"
                />
                <input
                  type="date"
                  lang="de-DE"
                  placeholder="Bis"
                  value={toDateInput}
                  onChange={(event) => setToDateInput(event.target.value)}
                  className="h-10 rounded-xl border px-3 text-sm outline-none focus:border-indigo-400"
                  style={{
                    borderColor: "var(--nav-border)",
                    backgroundColor: "var(--surface-soft)",
                    color: "var(--foreground)",
                  }}
                  aria-label="Enddatum"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFromDateInput("");
                    setToDateInput("");
                  }}
                  className="h-10 rounded-xl border px-3 text-xs font-semibold"
                  style={{
                    borderColor: "var(--nav-border)",
                    backgroundColor: "var(--surface-elevated)",
                    color: "var(--foreground)",
                  }}
                >
                  Zurücksetzen
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterSheet(false)}
                  className="h-10 rounded-xl bg-zinc-900 px-3 text-xs font-semibold text-white"
                >
                  Anwenden
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showAuthSheet ? (
          <>
            <motion.button
              type="button"
              aria-label="Login-Hinweis schließen"
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthSheet(false)}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0.85 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.85 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border p-4 shadow-2xl"
              style={{
                borderColor: "var(--nav-border)",
                backgroundColor: "var(--surface-elevated)",
              }}
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full" style={{ backgroundColor: "var(--nav-border)" }} />
              <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>Mit Uni-Mail freischalten</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                {authSheetReason}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href="/auth"
                  onClick={() => setShowAuthSheet(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border text-sm font-semibold"
                  style={{
                    borderColor: "var(--nav-border)",
                    backgroundColor: "var(--surface-elevated)",
                    color: "var(--foreground)",
                  }}
                >
                  Einloggen
                </Link>
                <Link
                  href="/auth"
                  onClick={() => setShowAuthSheet(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white"
                >
                  Account erstellen
                </Link>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      {fromDateGerman || toDateGerman ? (
        <p className="px-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
          Zeitraum: {fromDateGerman || "..."} – {toDateGerman || "..."}
        </p>
      ) : null}

      {hottestParty && topScore > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-1 flex items-center justify-between rounded-2xl border px-3 py-2 text-xs"
          style={{
            borderColor: "#fed7aa",
            backgroundColor: "#fff7ed",
            color: "#9a3412",
          }}
        >
          <div className="inline-flex min-w-0 items-center gap-2">
            <motion.span
              animate={{ scale: [1, 1.2, 1], rotate: [0, -8, 8, 0] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex"
            >
              <Flame size={14} fill="currentColor" />
            </motion.span>
            <span className="truncate font-semibold">Hot jetzt: {hottestParty.title}</span>
          </div>
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
            {topScore} Upvotes
          </span>
        </motion.div>
      ) : null}

      <div className="fixed bottom-28 right-[max(0.9rem,calc(50%-11.7rem))] z-20 flex flex-col items-end gap-2">
        <AnimatePresence>
          {showViewMenu ? (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className="rounded-2xl border p-2 shadow-lg"
              style={{
                borderColor: "var(--nav-border)",
                backgroundColor: "var(--surface-elevated)",
              }}
            >
              <div className="grid gap-1">
                {[
                  { key: "list", label: "Liste", icon: List },
                  { key: "map", label: "Karte", icon: MapIcon },
                  { key: "calendar", label: "Kalender", icon: CalendarDays },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = view === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setView(item.key as ViewKey);
                        setShowViewMenu(false);
                      }}
                      className={`flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold ${
                        active ? "bg-zinc-900 text-white" : ""
                      }`}
                      style={active ? undefined : { color: "var(--foreground)" }}
                    >
                      <Icon size={14} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setShowViewMenu((current) => !current)}
          className={`grid h-12 w-12 place-items-center rounded-full shadow-lg transition ${
            showViewMenu
              ? "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white"
              : "border"
          }`}
          style={
            showViewMenu
              ? undefined
              : {
                  borderColor: "var(--nav-border)",
                  backgroundColor: "var(--surface-elevated)",
                  color: "var(--foreground)",
                }
          }
          aria-label="Ansicht auswählen"
        >
          {view === "list" ? <List size={18} /> : null}
          {view === "map" ? <MapIcon size={18} /> : null}
          {view === "calendar" ? <CalendarDays size={18} /> : null}
        </button>
      </div>

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
            <div className="rounded-3xl p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]" style={{ backgroundColor: "var(--surface-elevated)" }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCalendarDate((current) => shiftIsoMonth(current, -1))}
                    className="grid h-8 w-8 place-items-center rounded-lg transition hover:opacity-95"
                    style={{
                      backgroundColor: "var(--surface-soft)",
                      color: "var(--foreground)",
                    }}
                    aria-label="Vorheriger Monat"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <p className="min-w-[140px] text-center text-sm font-semibold capitalize" style={{ color: "var(--foreground)" }}>
                    {calendarMeta.monthLabel}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedCalendarDate((current) => shiftIsoMonth(current, 1))}
                    className="grid h-8 w-8 place-items-center rounded-lg transition hover:opacity-95"
                    style={{
                      backgroundColor: "var(--surface-soft)",
                      color: "var(--foreground)",
                    }}
                    aria-label="Nächster Monat"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCalendarDate(todayKey)}
                  className="rounded-xl px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    backgroundColor: "var(--surface-soft)",
                    color: "var(--foreground)",
                  }}
                >
                  Heute
                </button>
              </div>

              <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
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
              <p className="px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Events am {new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${selectedCalendarDate}T12:00:00Z`))}
              </p>

              {selectedCalendarEvents.length ? (
                selectedCalendarEvents.map((party) => {
                  return (
                    <EventCard
                      key={party.id}
                      party={party}
                      expanded={expandedCardId === party.id}
                      isAuthenticated={isAuthenticated}
                      upvoted={upvotedPartyIds.includes(party.id)}
                      upvoteCount={upvoteCounts[party.id] ?? party.upvote_count ?? 0}
                      isHotNow={hotPartyIds.has(party.id)}
                      rankLabel={
                        rankByPartyId.has(party.id)
                          ? `Platz #${rankByPartyId.get(party.id)} nach Upvotes`
                          : null
                      }
                      onToggleUpvote={() => toggleUpvote(party.id)}
                      onRequestAction={handleRequestAction}
                      onChatAction={handleChatAction}
                      onToggle={() =>
                        setExpandedCardId((current) => (current === party.id ? null : party.id))
                      }
                    />
                  );
                })
              ) : (
                <div className="rounded-2xl p-4 text-sm shadow-[0_2px_10px_rgba(0,0,0,0.04)]" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--muted-foreground)" }}>
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
                  party={party}
                  expanded={expandedCardId === party.id}
                  isAuthenticated={isAuthenticated}
                  upvoted={upvotedPartyIds.includes(party.id)}
                  upvoteCount={upvoteCounts[party.id] ?? party.upvote_count ?? 0}
                  isHotNow={hotPartyIds.has(party.id)}
                  rankLabel={
                    rankByPartyId.has(party.id)
                      ? `Platz #${rankByPartyId.get(party.id)} nach Upvotes`
                      : null
                  }
                  onToggleUpvote={() => toggleUpvote(party.id)}
                  onRequestAction={handleRequestAction}
                  onChatAction={handleChatAction}
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
                className="rounded-3xl p-4 text-sm shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
                style={{ backgroundColor: "var(--surface-elevated)", color: "var(--muted-foreground)" }}
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
