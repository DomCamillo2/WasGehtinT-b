"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  Funnel,
  List,
  Map as MapIcon,
  UsersRound,
  X,
} from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PartyCard as PartyCardType } from "@/lib/types";

const DiscoverMap = dynamic(
  () => import("@/components/party/discover-map").then((module) => module.DiscoverMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="surface-card grid h-56 w-full place-items-center rounded-[24px] p-4 text-center text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        Kartenansicht wird geladen...
      </div>
    ),
  },
);

type FilterKey = "all" | "community" | "clubs" | "daytime" | "liked";
type ViewKey = "list" | "map" | "calendar";

const LOCAL_UPVOTED_EVENTS_KEY = "wasgeht-upvoted-events-v1";
const LOAD_MORE_STEP = 12;

const BERLIN_DAY_KEY_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Berlin",
});

const BERLIN_MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  month: "long",
  year: "numeric",
});

const BERLIN_SELECTED_DATE_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type Props = {
  parties: PartyCardType[];
  avatarFallback: string;
  isAuthenticated: boolean;
  canLoadMore: boolean;
  loadMoreHref: string;
};

function toDateKeyBerlin(iso: string) {
  return BERLIN_DAY_KEY_FORMATTER.format(new Date(iso));
}

function hasMapCoordinates(party: PartyCardType) {
  return Number.isFinite(party.public_lat) && Number.isFinite(party.public_lng);
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

export function DiscoverPremium({
  parties,
  avatarFallback,
  isAuthenticated,
  canLoadMore,
  loadMoreHref,
}: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [view, setView] = useState<ViewKey>("list");
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [authSheetReason, setAuthSheetReason] = useState("Um mitzumachen, logge dich mit deiner Uni-Mail ein.");
  const [fromDateInput, setFromDateInput] = useState("");
  const [toDateInput, setToDateInput] = useState("");
  const [onlyMappable, setOnlyMappable] = useState(false);
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
  const [visibleCount, setVisibleCount] = useState(LOAD_MORE_STEP);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_UPVOTED_EVENTS_KEY);
      if (!raw) {
        return;
      }

      const storedIds = JSON.parse(raw) as string[];
      if (!Array.isArray(storedIds) || storedIds.length === 0) {
        return;
      }

      const knownEventIds = new Set(parties.map((party) => party.id));
      const validStoredIds = storedIds.filter((id) => typeof id === "string" && knownEventIds.has(id));
      if (validStoredIds.length === 0) {
        return;
      }

      setUpvotedPartyIds((current) => Array.from(new Set([...current, ...validStoredIds])));
      setUpvoteCounts((current) => {
        const next = { ...current };
        for (const id of validStoredIds) {
          if ((next[id] ?? 0) <= 0) {
            next[id] = 1;
          }
        }
        return next;
      });
    } catch {
      // Ignore malformed local cache.
    }
  }, [parties]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_UPVOTED_EVENTS_KEY, JSON.stringify(upvotedPartyIds));
    } catch {
      // Ignore storage write issues.
    }
  }, [upvotedPartyIds]);

  useEffect(() => {
    setVisibleCount(LOAD_MORE_STEP);
  }, [filter, fromDateInput, toDateInput, onlyMappable, parties]);

  const fromDate = useMemo(() => parseGermanDateToIso(fromDateInput), [fromDateInput]);
  const toDate = useMemo(() => parseGermanDateToIso(toDateInput), [toDateInput]);
  const fromDateGerman = useMemo(() => formatIsoToGerman(fromDate), [fromDate]);
  const toDateGerman = useMemo(() => formatIsoToGerman(toDate), [toDate]);

  const todayKey = useMemo(
    () => BERLIN_DAY_KEY_FORMATTER.format(new Date()),
    [],
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayKey);
  const upvotedPartyIdSet = useMemo(() => new Set(upvotedPartyIds), [upvotedPartyIds]);

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
      const dateKey = toDateKeyBerlin(party.starts_at);
      if (dateKey < todayKey) {
        continue;
      }

      const score = upvoteCounts[party.id] ?? party.upvote_count ?? 0;
      if (score > max) {
        max = score;
      }
    }
    return max;
  }, [sortedParties, upvoteCounts, todayKey]);

  const hottestParty = useMemo(() => {
    if (topScore <= 0) {
      return null;
    }

    return (
      sortedParties.find((party) => {
        const dateKey = toDateKeyBerlin(party.starts_at);
        if (dateKey < todayKey) {
          return false;
        }
        return (upvoteCounts[party.id] ?? party.upvote_count ?? 0) === topScore;
      }) ?? null
    );
  }, [sortedParties, topScore, upvoteCounts, todayKey]);

  const hotPartyIds = useMemo(() => {
    if (!hottestParty) {
      return new Set<string>();
    }
    return new Set([hottestParty.id]);
  }, [hottestParty]);

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

  const filteredParties = useMemo(() => {
    const isClubEvent = (party: PartyCardType) => {
      if (!party.is_external) {
        return false;
      }

      if (party.event_scope === "daytime") {
        return false;
      }

      const categorySlug = (party.category_slug ?? "").toLowerCase();
      if (categorySlug === "market" || categorySlug === "flea-market") {
        return false;
      }

      const text = `${party.title} ${party.description ?? ""} ${party.vibe_label}`.toLowerCase();
      if (/markt|flohmarkt|messe|basar|rathaus|regionalmarkt|georgimarkt/.test(text)) {
        return false;
      }

      return true;
    };

    return sortedParties.filter((party) => {
      const dateKey = toDateKeyBerlin(party.starts_at);

      if (filter === "clubs" && !isClubEvent(party)) return false;
      if (filter === "daytime" && party.event_scope !== "daytime") return false;
      if (filter === "community" && !party.is_community && party.source_badge !== "Community") return false;
      if (filter === "liked" && !upvotedPartyIdSet.has(party.id)) return false;
      if (fromDate && dateKey < fromDate) return false;
      if (toDate && dateKey > toDate) return false;
      if (onlyMappable && !hasMapCoordinates(party)) return false;

      return true;
    });
  }, [filter, fromDate, onlyMappable, sortedParties, toDate, upvotedPartyIdSet]);

  const mapParties = useMemo(
    () => filteredParties.filter((party) => hasMapCoordinates(party)),
    [filteredParties],
  );

  const hiddenFromMapCount = filteredParties.length - mapParties.length;

  const visibleParties = useMemo(() => {
    return filteredParties.slice(0, visibleCount);
  }, [filteredParties, visibleCount]);

  const hasMoreVisibleParties = filteredParties.length > visibleCount;

  const filterItems: Array<{ key: FilterKey; label: string; icon?: typeof Flame }> = [
    { key: "all", label: "Alle", icon: Compass },
    { key: "daytime", label: "Tagesevents", icon: CalendarDays },
    { key: "community", label: "Community", icon: UsersRound },
    { key: "clubs", label: "Clubs", icon: Building2 },
    { key: "liked", label: "Gemerkt", icon: Flame },
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
    const wasUpvoted = upvotedPartyIds.includes(eventId);
    const nextUpvoted = !wasUpvoted;

    setUpvotedPartyIds((current) =>
      nextUpvoted ? Array.from(new Set([...current, eventId])) : current.filter((id) => id !== eventId),
    );
    setUpvoteCounts((current) => ({
      ...current,
      [eventId]: Math.max(0, (current[eventId] ?? 0) + (nextUpvoted ? 1 : -1)),
    }));

    try {
      const response = await fetch(`/api/parties/${encodeURIComponent(eventId)}/upvote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ upvoted: nextUpvoted }),
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
      // Keep optimistic state on network/backend issues.
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
    if (view !== "calendar") {
      return new Map<string, PartyCardType[]>();
    }

    const map = new Map<string, PartyCardType[]>();
    for (const party of filteredParties) {
      const key = toDateKeyBerlin(party.starts_at);
      const list = map.get(key) ?? [];
      list.push(party);
      map.set(key, list);
    }
    return map;
  }, [filteredParties, view]);

  const calendarMeta = useMemo(() => {
    if (view !== "calendar") {
      return null;
    }

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
      cells.push({ isoDate: `${year}-${mm}-${dd}`, day });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ isoDate: null, day: null });
    }

    const monthLabel = BERLIN_MONTH_LABEL_FORMATTER.format(monthStart);

    return { monthLabel, cells };
  }, [selectedCalendarDate, view]);

  const selectedCalendarEvents = useMemo(
    () => (view === "calendar" ? eventsByDate.get(selectedCalendarDate) ?? [] : []),
    [eventsByDate, selectedCalendarDate, view],
  );

  const desktopViewItems = [
    { key: "list" as const, label: "Liste", icon: List },
    { key: "map" as const, label: "Karte", icon: MapIcon },
    { key: "calendar" as const, label: "Kalender", icon: CalendarDays },
  ];

  return (
    <div className="relative space-y-4 pb-32 lg:space-y-6 lg:pb-20">
      <header className="surface-card relative overflow-hidden rounded-[28px] px-4 py-3.5 lg:px-7 lg:py-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-95"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--accent) 12%, transparent) 0%, color-mix(in srgb, var(--accent) 8%, transparent) 26%, color-mix(in srgb, var(--surface-card) 16%, transparent) 54%, transparent 88%), radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 38%, transparent), transparent 62%), radial-gradient(circle at right top, color-mix(in srgb, #38bdf8 18%, transparent), transparent 40%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-16 h-24 rounded-full blur-3xl"
          style={{
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--accent) 22%, transparent), color-mix(in srgb, #38bdf8 14%, transparent))",
            opacity: 0.4,
          }}
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 lg:gap-8">
            <div className="min-w-0 lg:max-w-[34rem]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-strong)]">
                {"WasGehtT\u00fcb"}
              </p>
              <h1 className="mt-1.5 max-w-[10ch] text-[2rem] font-black leading-[0.98] tracking-tight text-[color:var(--foreground)] lg:max-w-[12ch] lg:text-[3.2rem]">
                {"Was geht in T\u00fcbingen heute?"}
              </h1>
              <p className="mt-2 max-w-[30ch] text-[13px] leading-5 text-[color:var(--muted-foreground)] lg:max-w-[42ch] lg:text-[15px] lg:leading-7">
                {"Partys, Clubs und Events f\u00fcr heute. Schnell sehen, was sich wirklich lohnt."}
              </p>
            </div>

            <div className="flex items-center gap-2 lg:self-start">
              <ThemeToggle className="shadow-[0_12px_28px_-22px_var(--shadow-color)]" />
              <button
                type="button"
                onClick={() => setShowFilterSheet(true)}
                className="grid h-11 w-11 place-items-center rounded-2xl border shadow-[0_10px_25px_-18px_var(--shadow-color)]"
                style={{
                  borderColor: "var(--border-soft)",
                  backgroundColor: "var(--surface-soft)",
                  color: "var(--foreground)",
                }}
                aria-label="Filter öffnen"
              >
                <Funnel size={16} />
              </button>

              {isAuthenticated ? (
                <Link
                  href="/profile"
                  className="grid h-11 w-11 place-items-center rounded-2xl text-sm font-bold text-white shadow-[0_12px_28px_-18px_rgba(15,23,42,0.9)]"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-strong), var(--accent))",
                  }}
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
                  className="grid h-11 w-11 place-items-center rounded-2xl text-sm font-bold text-white shadow-[0_12px_28px_-18px_rgba(15,23,42,0.9)]"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-strong), var(--accent))",
                  }}
                  aria-label="Login öffnen"
                >
                  {avatarFallback}
                </button>
              )}
            </div>
          </div>

        </div>
      </header>

      <div className="space-y-3 lg:flex lg:items-center lg:justify-between lg:gap-4 lg:space-y-0">
        <div className="grid grid-cols-2 gap-2 px-1 py-1 sm:flex sm:flex-wrap sm:gap-2 lg:px-0 lg:py-0">
          {filterItems.map((item) => {
            const active = item.key === filter;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`min-w-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${active ? "text-white shadow-md" : ""}`}
                style={
                  active
                    ? {
                        background:
                          "linear-gradient(135deg, color-mix(in srgb, var(--accent) 88%, white 12%), color-mix(in srgb, var(--accent-strong) 58%, white 42%))",
                      }
                    : {
                        color: "var(--muted-foreground)",
                        backgroundColor: "color-mix(in srgb, var(--surface-soft) 82%, transparent)",
                      }
                }
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  {item.icon ? <item.icon size={14} strokeWidth={2} /> : null}
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="hidden lg:inline-flex lg:items-center lg:gap-1 lg:rounded-[20px] lg:border lg:p-1"
          style={{
            borderColor: "var(--border-soft)",
            backgroundColor: "color-mix(in srgb, var(--surface-card) 74%, transparent)",
          }}
        >
          {desktopViewItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  active ? "text-white shadow-md" : ""
                }`}
                style={
                  active
                    ? {
                        background:
                          "linear-gradient(135deg, color-mix(in srgb, var(--accent) 88%, white 12%), color-mix(in srgb, var(--accent-strong) 58%, white 42%))",
                      }
                    : { color: "var(--muted-foreground)" }
                }
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showFilterSheet ? (
        <>
          <button
            type="button"
            aria-label="Filter schließen"
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => setShowFilterSheet(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md rounded-t-3xl border p-4 shadow-2xl"
            style={{
              borderColor: "var(--nav-border)",
              backgroundColor: "var(--surface-elevated)",
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Filter
              </p>
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

            <button
              type="button"
              onClick={() => setOnlyMappable((current) => !current)}
              className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl border px-3 text-xs font-semibold"
              style={{
                borderColor: "var(--nav-border)",
                backgroundColor: onlyMappable
                  ? "color-mix(in srgb, var(--accent) 14%, var(--surface-soft))"
                  : "var(--surface-elevated)",
                color: "var(--foreground)",
              }}
            >
              {onlyMappable ? "Nur Events mit Kartenpunkt: Aktiv" : "Nur Events mit Kartenpunkt"}
            </button>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFromDateInput("");
                  setToDateInput("");
                  setOnlyMappable(false);
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
                className="h-10 rounded-xl px-3 text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, var(--accent-strong), var(--accent))" }}
              >
                Anwenden
              </button>
            </div>
          </div>
        </>
      ) : null}

      {showAuthSheet ? (
        <>
          <button
            type="button"
            aria-label="Login-Hinweis schließen"
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setShowAuthSheet(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border p-4 shadow-2xl"
            style={{
              borderColor: "var(--nav-border)",
              backgroundColor: "var(--surface-elevated)",
            }}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full" style={{ backgroundColor: "var(--nav-border)" }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
              Mit Uni-Mail freischalten
            </h2>
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
              <span
                aria-disabled="true"
                className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-xl border text-sm font-semibold"
                style={{
                  borderColor: "var(--border-soft)",
                  backgroundColor: "var(--surface-soft)",
                  color: "var(--muted-foreground)",
                }}
              >
                Kontoerstellung folgt
              </span>
            </div>
          </div>
        </>
      ) : null}

      {fromDateGerman || toDateGerman ? (
        <p className="px-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
          Zeitraum: {fromDateGerman || "..."} - {toDateGerman || "..."}
        </p>
      ) : null}

      <p className="px-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
        {filteredParties.length} Events nach Filter
        {hiddenFromMapCount > 0 ? ` · ${hiddenFromMapCount} ohne Kartenpunkt` : ""}
      </p>

      {hottestParty && topScore > 0 && view !== "list" ? (
        <div
          className="mx-1 flex items-center justify-between rounded-[24px] border px-3 py-3 text-xs shadow-[0_16px_36px_-26px_rgba(249,115,22,0.55)]"
          style={{
            borderColor: "#fdba74",
            background: "linear-gradient(135deg, rgba(255,247,237,0.96), rgba(255,237,213,0.92))",
            color: "#9a3412",
          }}
        >
          <div className="inline-flex min-w-0 items-center gap-2">
            <span className="inline-flex text-orange-600">
              <Flame size={14} fill="currentColor" />
            </span>
            <span className="truncate font-semibold">{"Hot jetzt: "}{hottestParty.title}</span>
          </div>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-orange-700">
            {topScore} Upvotes
          </span>
        </div>
      ) : null}

      <div className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] right-[max(0.9rem,calc(50%-11.7rem))] z-20 flex flex-col items-end gap-2 lg:hidden">
        {showViewMenu ? (
          <div
            className="surface-card rounded-[22px] p-2"
            style={{
              backgroundColor: "var(--surface-card)",
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
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setShowViewMenu((current) => !current)}
            className={`grid h-12 w-12 place-items-center rounded-2xl transition ${
              showViewMenu ? "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white" : "border"
            }`}
          style={
            showViewMenu
              ? undefined
              : {
                  borderColor: "var(--nav-border)",
                  backgroundColor: "var(--surface-elevated)",
                  color: "var(--foreground)",
                  boxShadow: "0 20px 42px -18px rgba(2, 6, 23, 0.62)",
                }
          }
          aria-label="Ansicht auswählen"
        >
          {view === "list" ? <List size={18} /> : null}
          {view === "map" ? <MapIcon size={18} /> : null}
          {view === "calendar" ? <CalendarDays size={18} /> : null}
        </button>
      </div>

      {view === "map" ? (
        <div className="space-y-2">
          {mapParties.length ? (
            <DiscoverMap parties={mapParties} />
          ) : (
            <div className="surface-card rounded-[24px] p-4 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Für den aktiven Filter sind keine Events mit Kartenposition verfügbar.
            </div>
          )}
        </div>
      ) : view === "calendar" ? (
        <div className="space-y-3">
          <div className="surface-card rounded-[28px] p-3">
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
                  {calendarMeta?.monthLabel}
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
              {(calendarMeta?.cells ?? []).map((cell, index) => {
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
                        : ""
                    }`}
                    style={
                      isSelected
                        ? undefined
                        : {
                            backgroundColor: "var(--surface-soft)",
                            color: "var(--foreground)",
                          }
                    }
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
              Events am {BERLIN_SELECTED_DATE_FORMATTER.format(new Date(`${selectedCalendarDate}T12:00:00Z`))}
            </p>

            {selectedCalendarEvents.length ? (
              selectedCalendarEvents.map((party) => (
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
              ))
            ) : (
              <div className="surface-card rounded-[24px] p-4 text-sm" style={{ color: "var(--muted-foreground)" }}>
                Keine Events für diesen Tag.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {visibleParties.map((party) => (
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
            ))}
          </div>

          {!visibleParties.length ? (
            <div className="surface-card rounded-[24px] p-4 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Für den aktiven Filter sind aktuell keine Events verfügbar.
            </div>
          ) : null}

          {filteredParties.length && (hasMoreVisibleParties || canLoadMore) ? (
            <div className="surface-card rounded-[28px] p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold" style={{ color: "var(--foreground)" }}>
                    {hasMoreVisibleParties ? "Mehr Events anzeigen" : "Weitere Wochen ansehen"}
                  </p>
                  <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted-foreground)" }}>
                    {hasMoreVisibleParties
                      ? "Zeigt sofort die nächsten 20 Ergebnisse an."
                      : "Wenn du weiter vorausplanen willst, laden wir die nächsten Wochen erst auf Wunsch nach."}
                  </p>
                </div>
                {hasMoreVisibleParties ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((current) => current + LOAD_MORE_STEP)}
                    className="inline-flex shrink-0 items-center rounded-full px-4 py-2 text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, var(--accent-strong), var(--accent))" }}
                  >
                    Mehr laden
                  </button>
                ) : (
                  <Link
                    href={loadMoreHref}
                    className="inline-flex shrink-0 items-center rounded-full px-4 py-2 text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, var(--accent-strong), var(--accent))" }}
                  >
                    Mehr laden
                  </Link>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

