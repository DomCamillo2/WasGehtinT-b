"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
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
import { useToast } from "@/components/ui/toast-provider";
import {
  type DiscoverFilterKey,
  filterDiscoverEvents,
  sortDiscoverByUpvotesThenDate,
} from "@/lib/discover-filters";
import { berlinDayKeyFromIso, buildCalendarMonthGrid, shiftIsoMonth } from "@/lib/discover-calendar";
import { SITE_LOGO_SRC } from "@/lib/site-config";
import { asServiceError } from "@/services/service-error";
import { DiscoverEvent } from "@/services/discover/discover-view-model";
import { togglePartyUpvote } from "@/services/events/upvotes-service";

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

type ViewKey = "calendar" | "list" | "map";

const LOCAL_UPVOTED_EVENTS_KEY = "wasgeht-upvoted-events-v1";
const LOAD_MORE_STEP = 12;

const BERLIN_CALENDAR_HEADING_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const BERLIN_DAY_CHIP_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

type Props = {
  parties: DiscoverEvent[];
  avatarFallback: string;
  isAuthenticated: boolean;
  canLoadMore: boolean;
  currentWeeks: number;
  initialView: ViewKey;
  initialFilter: DiscoverFilterKey;
  initialCalendarDate: string;
};

function getFallbackVenueKey(party: DiscoverEvent) {
  const location = `${party.locationName ?? ""} ${party.vibeLabel} ${party.title}`.toLowerCase();

  if (location.includes("kuckuck")) return "kuckuck";
  if (location.includes("clubhaus")) return "clubhaus";
  if (location.includes("schlachthaus")) return "schlachthaus";
  if (
    location.includes("frau holle") ||
    location.includes("frau_holle") ||
    location.includes("holle") ||
    location.includes("haaggasse")
  ) {
    return "frau-holle";
  }
  if (
    location.includes("schwarzes schaf") ||
    location.includes("schwarzesschaf") ||
    location.includes("schaf")
  ) {
    return "schwarzes-schaf";
  }
  if (location.includes("epplehaus")) return "epplehaus";
  if (location.includes("blauer turm")) return "blauer-turm";
  if (location.includes("top10")) return "top10";
  if (location.includes("sudhaus")) return "sudhaus";
  if (location.includes("uhlandstraße") || location.includes("uhlandstrasse") || location.includes("flohmarkt")) {
    return "uhlandstrasse";
  }
  if (location.includes("marktplatz") || location.includes("rathaus") || location.includes("markt")) {
    return "marktplatz";
  }

  return null;
}

function hasMapCoordinates(party: DiscoverEvent) {
  return (
    (Number.isFinite(party.publicLat) && Number.isFinite(party.publicLng)) ||
    getFallbackVenueKey(party) !== null
  );
}

export function DiscoverPremium({
  parties,
  avatarFallback,
  isAuthenticated,
  canLoadMore,
  currentWeeks,
  initialView,
  initialFilter,
  initialCalendarDate,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const todayKey = useMemo(() => berlinDayKeyFromIso(new Date().toISOString()), []);
  const [filter, setFilter] = useState<DiscoverFilterKey>(initialFilter);
  const [view, setView] = useState<ViewKey>(initialView);
  const [likedOnly] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("liked") === "1";
  });
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [authSheetReason, setAuthSheetReason] = useState("Um mitzumachen, logge dich mit deiner Uni-Mail ein.");
  const [onlyMappable, setOnlyMappable] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(initialCalendarDate || todayKey);
  const [calendarMonthDate, setCalendarMonthDate] = useState<string>(initialCalendarDate || todayKey);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const initialUpvoteCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const party of parties) {
      map[party.id] = Math.max(0, Number(party.upvoteCount ?? 0));
    }
    return map;
  }, [parties]);
  const initialUpvotedIds = useMemo(
    () => {
      const base = parties.filter((party) => party.upvotedByMe).map((party) => party.id);
      if (typeof window === "undefined") return base;
      try {
        const raw = window.localStorage.getItem(LOCAL_UPVOTED_EVENTS_KEY);
        if (!raw) return base;
        const storedIds = JSON.parse(raw) as string[];
        if (!Array.isArray(storedIds) || storedIds.length === 0) return base;
        const knownEventIds = new Set(parties.map((party) => party.id));
        const validStoredIds = storedIds.filter((id) => typeof id === "string" && knownEventIds.has(id));
        return Array.from(new Set([...base, ...validStoredIds]));
      } catch {
        return base;
      }
    },
    [parties],
  );
  const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>(initialUpvoteCounts);
  const [upvotedPartyIds, setUpvotedPartyIds] = useState<string[]>(initialUpvotedIds);
  const [visibleCount, setVisibleCount] = useState(LOAD_MORE_STEP);
  const [isLoadingMoreWeeks, startLoadingMoreWeeks] = useTransition();

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_UPVOTED_EVENTS_KEY, JSON.stringify(upvotedPartyIds));
    } catch {
      // Ignore storage write issues.
    }
  }, [upvotedPartyIds]);

  useEffect(() => {
    if (typeof window === "undefined" || pathname !== "/discover") {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (view !== "list") {
      params.set("view", view);
    } else {
      params.delete("view");
    }

    if (filter !== "all") {
      params.set("type", filter);
    } else {
      params.delete("type");
    }

    if (view === "calendar" && selectedCalendarDate) {
      params.set("date", selectedCalendarDate);
    } else {
      params.delete("date");
    }

    // Important: preserve `weeks` from the current URL so "Mehr laden" navigation
    // isn't immediately overwritten by this sync effect.
    const nextHref = `/discover?${params.toString()}`;
    const currentHref = `${window.location.pathname}${window.location.search}`;

    if (currentHref !== nextHref) {
      router.replace(nextHref, { scroll: false });
    }
  }, [filter, pathname, router, selectedCalendarDate, view]);

  const sortedParties = useMemo(
    () => sortDiscoverByUpvotesThenDate(parties, upvoteCounts),
    [parties, upvoteCounts],
  );

  const topScore = useMemo(() => {
    let max = 0;
    for (const party of sortedParties) {
      const dateKey = berlinDayKeyFromIso(party.startsAt);
      if (dateKey < todayKey) {
        continue;
      }

      const score = upvoteCounts[party.id] ?? party.upvoteCount ?? 0;
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
        const dateKey = berlinDayKeyFromIso(party.startsAt);
        if (dateKey < todayKey) {
          return false;
        }
        return (upvoteCounts[party.id] ?? party.upvoteCount ?? 0) === topScore;
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
      if (party.isExternal) {
        continue;
      }

      const score = upvoteCounts[party.id] ?? party.upvoteCount ?? 0;
      if (score <= 0) {
        continue;
      }

      rankMap.set(party.id, rank);
      rank += 1;
    }

    return rankMap;
  }, [sortedParties, upvoteCounts]);

  const filteredParties = useMemo(() => {
    const byType = filterDiscoverEvents(sortedParties, filter);
    if (!onlyMappable) {
      return byType;
    }
    return byType.filter((party) => hasMapCoordinates(party));
  }, [filter, onlyMappable, sortedParties]);

  const mapParties = useMemo(
    () => filteredParties.filter((party) => hasMapCoordinates(party)),
    [filteredParties],
  );

  const visibleParties = useMemo(() => {
    return filteredParties.slice(0, visibleCount);
  }, [filteredParties, visibleCount]);

  const hasMoreVisibleParties = filteredParties.length > visibleCount;

  const filterItems: Array<{ key: DiscoverFilterKey; label: string; icon?: typeof Flame }> = [
    { key: "all", label: "Alle", icon: Compass },
    { key: "clubs", label: "Clubs", icon: Building2 },
    { key: "daytime", label: "Tagesevents", icon: CalendarDays },
    { key: "community", label: "Community", icon: UsersRound },
  ];

  async function toggleUpvote(eventId: string) {
    const wasUpvoted = upvotedPartyIds.includes(eventId);
    const nextUpvoted = !wasUpvoted;
    const previousCount = upvoteCounts[eventId] ?? parties.find((party) => party.id === eventId)?.upvoteCount ?? 0;

    setUpvotedPartyIds((current) =>
      nextUpvoted ? Array.from(new Set([...current, eventId])) : current.filter((id) => id !== eventId),
    );
    setUpvoteCounts((current) => ({
      ...current,
      [eventId]: Math.max(0, (current[eventId] ?? 0) + (nextUpvoted ? 1 : -1)),
    }));

    try {
      const data = await togglePartyUpvote(eventId, nextUpvoted);
      setUpvotedPartyIds((current) =>
        data.upvoted
          ? Array.from(new Set([...current, eventId]))
          : current.filter((id) => id !== eventId),
      );
      setUpvoteCounts((current) => ({
        ...current,
        [eventId]: Math.max(0, Number(data.upvoteCount ?? 0)),
      }));
    } catch (error) {
      setUpvotedPartyIds((current) =>
        wasUpvoted ? Array.from(new Set([...current, eventId])) : current.filter((id) => id !== eventId),
      );
      setUpvoteCounts((current) => ({
        ...current,
        [eventId]: Math.max(0, previousCount),
      }));

      const serviceError = asServiceError(error);
      showToast({
        variant: "error",
        title: "Teilnahme fehlgeschlagen",
        message: serviceError.message,
      });
    }
  }

  const viewItems = [
    { key: "calendar" as const, label: "Kalender", icon: CalendarDays },
    { key: "list" as const, label: "Liste", icon: List },
    { key: "map" as const, label: "Karte", icon: MapIcon },
  ];

  function buildDiscoverHref(targetWeeks = currentWeeks) {
    const params = new URLSearchParams();

    if (view !== "list") {
      params.set("view", view);
    }

    if (filter !== "all") {
      params.set("type", filter);
    }

    if (view === "calendar" && selectedCalendarDate) {
      params.set("date", selectedCalendarDate);
    }

    params.set("weeks", String(targetWeeks));

    if (likedOnly) {
      params.set("liked", "1");
    }

    return `/discover?${params.toString()}`;
  }

  function buildLoadMoreHref() {
    const nextWeeks = Math.min(24, currentWeeks + 4);
    return buildDiscoverHref(nextWeeks);
  }

  function resetToAllView() {
    setFilter("all");
    setOnlyMappable(false);
    setView("list");
    setVisibleCount(LOAD_MORE_STEP);
    setSelectedCalendarDate(todayKey);
    setCalendarMonthDate(todayKey);
  }

  function handleFilterSelection(nextFilter: DiscoverFilterKey) {
    if (nextFilter === "all") {
      resetToAllView();
      return;
    }

    setFilter(nextFilter);
    setVisibleCount(LOAD_MORE_STEP);
  }

  const selectedCalendarEvents = useMemo(() => {
    return filteredParties.filter((party) => berlinDayKeyFromIso(party.startsAt) === selectedCalendarDate);
  }, [filteredParties, selectedCalendarDate]);

  const selectedCalendarLabel = useMemo(() => {
    if (!selectedCalendarDate) {
      return "";
    }

    return BERLIN_CALENDAR_HEADING_FORMATTER.format(new Date(`${selectedCalendarDate}T12:00:00Z`));
  }, [selectedCalendarDate]);

  const calendarMonthMeta = useMemo(
    () => buildCalendarMonthGrid(calendarMonthDate, todayKey),
    [calendarMonthDate, todayKey],
  );

  return (
    <div className="relative space-y-4 pb-32 lg:space-y-6 lg:pb-20">
      <div className="sticky top-2 z-20 flex items-center justify-end gap-2 px-1">
        <ThemeToggle className="h-9 w-9 border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] shadow-none" />
        <button
          type="button"
          onClick={() => setShowFilterSheet(true)}
          className="grid h-9 w-9 place-items-center rounded-2xl border"
          style={{
            borderColor: "var(--border-soft)",
            backgroundColor: "var(--surface-soft)",
            color: "var(--muted-foreground)",
          }}
          aria-label="Filter öffnen"
        >
          <Funnel size={15} />
        </button>

        {isAuthenticated ? (
          <Link
            href="/profile"
            className="grid h-9 w-9 place-items-center rounded-2xl text-xs font-bold text-white"
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
              setAuthSheetReason("Profile und persoenliche Features werden spaeter freigeschaltet.");
              setShowAuthSheet(true);
            }}
            className="grid h-9 w-9 place-items-center rounded-2xl text-xs font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--accent-strong), var(--accent))",
            }}
            aria-label="Profil-Hinweis öffnen"
          >
            {avatarFallback}
          </button>
        )}
      </div>

      <header className="surface-card relative overflow-hidden rounded-[28px] px-4 py-4 lg:px-7 lg:py-6">
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
          <div className="flex flex-col gap-3 lg:gap-8">
            <div className="min-w-0 max-w-[18rem] sm:max-w-[24rem] lg:max-w-[34rem]">
              <div className="flex items-center gap-3">
                <Image
                  src={SITE_LOGO_SRC}
                  alt=""
                  width={56}
                  height={56}
                  className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
                />
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-strong)]">
                  {"WasGehtT\u00fcb"}
                </p>
              </div>
              <h1 className="mt-1.5 max-w-[14ch] text-[1.85rem] font-black leading-[0.98] tracking-tight text-[color:var(--foreground)] sm:max-w-[16ch] sm:text-[2rem] lg:max-w-[18ch] lg:text-[3.2rem]">
                {"Was geht in T\u00fcbingen heute?"}
              </h1>
              <p
                className="mt-2 text-sm leading-snug lg:text-[0.98rem]"
                style={{ color: "var(--muted-foreground)" }}
              >
                {"Clubs, Studentenpartys und Events - gesammelt an einem Ort."}
              </p>
              {/* SEO text — hidden visually, readable by crawlers and screen readers */}
              <p className="sr-only">
                WasGehtTueb sammelt aktuelle Studentenpartys, Clubnaechte, Community-Treffen und
                Tagesevents in Tuebingen. Hier findest du kommende Events mit Zeiten, Orten,
                Kartenpunkten und weiterfuehrenden Links zu Veranstaltern und Locations.
              </p>
              <p
                className="mt-2.5 text-[12px] leading-relaxed sm:text-[13px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                {"Alles, was in Tuebingen heute wichtig ist, auf einen Blick."}
              </p>
              <div
                className="mt-4 inline-flex w-full items-center gap-1 rounded-[18px] border p-1 sm:w-auto"
                style={{
                  borderColor: "var(--border-soft)",
                  backgroundColor: "color-mix(in srgb, var(--surface-card) 74%, transparent)",
                }}
              >
                {viewItems.map((item) => {
                  const Icon = item.icon;
                  const active = view === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setView(item.key)}
                      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition sm:flex-none sm:px-2.5 sm:text-sm ${
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
                      aria-label={`${item.label} anzeigen`}
                    >
                      <Icon size={13} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      </header>

      <div className="space-y-3">
        <div className="hide-scrollbar flex snap-x items-center gap-2 overflow-x-auto px-1 py-1">
          {filterItems.map((item) => {
            const active = item.key === filter;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleFilterSelection(item.key)}
                className={`shrink-0 snap-start rounded-full px-4 py-2.5 text-sm font-semibold transition ${active ? "text-white shadow-md" : ""}`}
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

            <button
              type="button"
              onClick={() => {
                setOnlyMappable((current) => !current);
                setVisibleCount(LOAD_MORE_STEP);
              }}
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
                  resetToAllView();
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
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                Profilfunktionen folgen spaeter
              </h2>
              <button
                type="button"
                onClick={() => setShowAuthSheet(false)}
                className="grid h-9 w-9 place-items-center rounded-full border"
                style={{
                  borderColor: "var(--border-soft)",
                  backgroundColor: "var(--surface-soft)",
                  color: "var(--muted-foreground)",
                }}
                aria-label="Hinweis schließen"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              {authSheetReason}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <span
                aria-disabled="true"
                className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-xl border text-sm font-semibold"
                style={{
                  borderColor: "var(--border-soft)",
                  backgroundColor: "var(--surface-soft)",
                  color: "var(--muted-foreground)",
                }}
              >
                Login spaeter
              </span>
              <span
                aria-disabled="true"
                className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-xl border text-sm font-semibold"
                style={{
                  borderColor: "var(--border-soft)",
                  backgroundColor: "var(--surface-soft)",
                  color: "var(--muted-foreground)",
                }}
              >
                Konto spaeter
              </span>
            </div>
          </div>
        </>
      ) : null}

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
            {topScore} Teilnahmen
          </span>
        </div>
      ) : null}

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
        <div className="space-y-4">
          <div className="surface-card rounded-[28px] p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCalendarMonthDate((current) => shiftIsoMonth(current || todayKey, -1))}
                className="grid h-9 w-9 place-items-center rounded-lg"
                style={{ backgroundColor: "var(--surface-soft)", color: "var(--foreground)" }}
                aria-label="Vorheriger Monat"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <p className="text-sm font-semibold capitalize" style={{ color: "var(--foreground)" }}>
                {calendarMonthMeta.monthLabel}
              </p>
              <button
                type="button"
                onClick={() => setCalendarMonthDate((current) => shiftIsoMonth(current || todayKey, 1))}
                className="grid h-9 w-9 place-items-center rounded-lg"
                style={{ backgroundColor: "var(--surface-soft)", color: "var(--foreground)" }}
                aria-label="Nächster Monat"
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              {"Mo Di Mi Do Fr Sa So".split(" ").map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarMonthMeta.cells.map((cell, index) => {
                if (!cell.isoDate || !cell.day) {
                  return <div key={`calendar-empty-${index}`} className="h-9" />;
                }

                const hasEvents = filteredParties.some((party) => berlinDayKeyFromIso(party.startsAt) === cell.isoDate);
                const active = selectedCalendarDate === cell.isoDate;

                return (
                  <button
                    key={cell.isoDate}
                    type="button"
                    onClick={() => setSelectedCalendarDate(cell.isoDate!)}
                    className={`relative h-9 rounded-lg text-xs font-semibold ${active ? "text-white" : ""}`}
                    style={
                      active
                        ? {
                            background:
                              "linear-gradient(135deg, color-mix(in srgb, var(--accent) 88%, white 12%), color-mix(in srgb, var(--accent-strong) 58%, white 42%))",
                          }
                        : {
                            backgroundColor: "var(--surface-soft)",
                            color: "var(--foreground)",
                          }
                    }
                    aria-label={BERLIN_DAY_CHIP_FORMATTER.format(new Date(`${cell.isoDate}T12:00:00Z`))}
                  >
                    {cell.day}
                    {hasEvents ? <span className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${active ? "bg-white" : "bg-indigo-500"}`} /> : null}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedCalendarDate(todayKey);
                setCalendarMonthDate(todayKey);
              }}
              className="mt-3 h-9 w-full rounded-xl border px-3 text-xs font-semibold"
              style={{ borderColor: "var(--nav-border)", color: "var(--foreground)" }}
            >
              Heute
            </button>
          </div>

          <div className="space-y-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Events am {selectedCalendarLabel}
            </p>

            {selectedCalendarEvents.length ? (
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {selectedCalendarEvents.map((party) => (
                  <EventCard
                    key={party.id}
                    party={party}
                    expanded={expandedCardId === party.id}
                    isAuthenticated={isAuthenticated}
                    upvoted={upvotedPartyIds.includes(party.id)}
                    upvoteCount={upvoteCounts[party.id] ?? party.upvoteCount ?? 0}
                    isHotNow={hotPartyIds.has(party.id)}
                    rankLabel={
                      rankByPartyId.has(party.id)
                        ? `Platz #${rankByPartyId.get(party.id)} nach Teilnahmen`
                        : null
                    }
                    onToggleUpvote={() => toggleUpvote(party.id)}
                    onToggle={() =>
                      setExpandedCardId((current) => (current === party.id ? null : party.id))
                    }
                  />
                ))}
              </div>
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
                upvoteCount={upvoteCounts[party.id] ?? party.upvoteCount ?? 0}
                isHotNow={hotPartyIds.has(party.id)}
                rankLabel={
                  rankByPartyId.has(party.id)
                    ? `Platz #${rankByPartyId.get(party.id)} nach Teilnahmen`
                    : null
                }
                onToggleUpvote={() => toggleUpvote(party.id)}
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <p className="font-semibold" style={{ color: "var(--foreground)" }}>
                    {hasMoreVisibleParties ? "Mehr Events anzeigen" : "Weitere Wochen ansehen"}
                  </p>
                  <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted-foreground)" }}>
                    {hasMoreVisibleParties
                      ? `Zeigt sofort die naechsten ${LOAD_MORE_STEP} Events in deiner aktuellen Ansicht an.`
                      : "Wenn du weiter vorausplanen willst, laden wir passend zu deiner aktuellen Ansicht weitere Wochen nach."}
                  </p>
                </div>
                {hasMoreVisibleParties ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((current) => current + LOAD_MORE_STEP)}
                    className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold text-white sm:h-10 sm:w-auto sm:px-4 sm:text-xs"
                    style={{ background: "linear-gradient(135deg, var(--accent-strong), var(--accent))" }}
                  >
                    Mehr laden
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      startLoadingMoreWeeks(() => {
                        router.replace(buildLoadMoreHref(), { scroll: false });
                      });
                    }}
                    disabled={isLoadingMoreWeeks}
                    className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold text-white sm:h-10 sm:w-auto sm:px-4 sm:text-xs"
                    style={{ background: "linear-gradient(135deg, var(--accent-strong), var(--accent))" }}
                  >
                    {isLoadingMoreWeeks ? "Lädt..." : "Mehr laden"}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
