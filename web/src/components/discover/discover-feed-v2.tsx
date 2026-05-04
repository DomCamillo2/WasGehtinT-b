"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Flame,
  Heart,
  LayoutGrid,
  List,
  MapPin,
  Search,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { berlinDayKeyFromIso } from "@/lib/discover-calendar";
import {
  type DiscoverFilterKey,
  filterDiscoverEvents,
  sortDiscoverByUpvotesDesc,
  sortDiscoverByUpvotesThenDate,
} from "@/lib/discover-filters";
import { filterPartiesWithMapCoords } from "@/lib/discover-map-coords";
import { asServiceError } from "@/services/service-error";
import type { DiscoverEvent } from "@/services/discover/discover-view-model";
import { SITE_LOGO_SRC } from "@/lib/site-config";
import { togglePartyUpvote } from "@/services/events/upvotes-service";
import { DiscoverBottomNavV2 } from "./discover-bottom-nav-v2";
import { DiscoverCalendarPanelV2 } from "./discover-calendar-panel-v2";
import { DiscoverEventCardV2 } from "./discover-event-card-v2";
import { DiscoverEventListItemV2 } from "./discover-event-list-item-v2";

const DiscoverMapLazy = dynamic(
  () => import("@/components/party/discover-map").then((m) => m.DiscoverMap),
  { ssr: false },
);

const LOCAL_UPVOTED_EVENTS_KEY = "wasgeht-upvoted-events-v1";
const LOAD_MORE_STEP = 24;

const BERLIN_DATE_SHORT = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  day: "2-digit",
  month: "short",
});
const BERLIN_TIME = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
});

type Props = {
  parties: DiscoverEvent[];
  avatarFallback: string;
  isAuthenticated: boolean;
  canLoadMore: boolean;
  currentWeeks: number;
  initialFilter: DiscoverFilterKey;
  initialCalendarDate?: string;
};

function resolveSeedCalendarDate(urlDate: string | null, init: string | undefined, today: string): string {
  if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) return urlDate;
  if (init && /^\d{4}-\d{2}-\d{2}$/.test(init)) return init;
  return today;
}

function formatEventDate(iso: string) {
  return BERLIN_DATE_SHORT.format(new Date(iso));
}

function formatEventTime(iso: string) {
  return BERLIN_TIME.format(new Date(iso));
}

function venueLabel(event: DiscoverEvent) {
  return (event.locationName ?? event.vibeLabel ?? "Tübingen").trim();
}

function buildClassicDiscoverHref(): string {
  if (typeof window === "undefined") return "/discover";
  const params = new URLSearchParams(window.location.search);
  params.delete("ui");
  const q = params.toString();
  return q ? `/discover?${q}` : "/discover";
}

export function DiscoverFeedV2({
  parties,
  avatarFallback,
  isAuthenticated,
  canLoadMore,
  currentWeeks,
  initialFilter,
  initialCalendarDate,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<DiscoverFilterKey>(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list" | "calendar" | "map">("cards");
  const [visibleCount, setVisibleCount] = useState(LOAD_MORE_STEP);

  const todayKey = useMemo(() => berlinDayKeyFromIso(new Date().toISOString()), []);

  const [calendarDate, setCalendarDate] = useState(() =>
    resolveSeedCalendarDate(searchParams.get("date"), initialCalendarDate, todayKey),
  );
  const [calendarMonth, setCalendarMonth] = useState(() =>
    resolveSeedCalendarDate(searchParams.get("date"), initialCalendarDate, todayKey),
  );

  const likedOnly = searchParams.get("liked") === "1";

  /** Counts follow server; localStorage only drives Merkliste (upvotedPartyIds), not displayed totals. */
  const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const party of parties) {
      map[party.id] = Math.max(0, Number(party.upvoteCount ?? 0));
    }
    return map;
  });

  const [upvotedPartyIds, setUpvotedPartyIds] = useState<string[]>(() => {
    const base = parties.filter((party) => party.upvotedByMe).map((party) => party.id);
    if (typeof window === "undefined") {
      return base;
    }
    try {
      const raw = window.localStorage.getItem(LOCAL_UPVOTED_EVENTS_KEY);
      if (!raw) return base;
      const storedIds = JSON.parse(raw) as string[];
      if (!Array.isArray(storedIds) || storedIds.length === 0) return base;
      const known = new Set(parties.map((p) => p.id));
      const valid = storedIds.filter((id) => typeof id === "string" && known.has(id));
      if (valid.length === 0) return base;
      return Array.from(new Set([...base, ...valid]));
    } catch {
      return base;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_UPVOTED_EVENTS_KEY, JSON.stringify(upvotedPartyIds));
    } catch {
      /* ignore */
    }
  }, [upvotedPartyIds]);

  useEffect(() => {
    if (typeof window === "undefined" || pathname !== "/discover") return;
    const params = new URLSearchParams(window.location.search);
    params.set("ui", "new");
    if (filter !== "all") params.set("type", filter);
    else params.delete("type");
    if (viewMode === "calendar") {
      params.set("date", calendarDate);
    } else {
      params.delete("date");
    }
    const nextHref = `/discover?${params.toString()}`;
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (currentHref !== nextHref) {
      router.replace(nextHref, { scroll: false });
    }
  }, [filter, viewMode, calendarDate, pathname, router]);

  const sortedParties = useMemo(
    () => sortDiscoverByUpvotesThenDate(parties, upvoteCounts),
    [parties, upvoteCounts],
  );

  const topScore = useMemo(() => {
    let max = 0;
    for (const party of sortedParties) {
      if (berlinDayKeyFromIso(party.startsAt) < todayKey) continue;
      const score = upvoteCounts[party.id] ?? party.upvoteCount ?? 0;
      if (score > max) max = score;
    }
    return max;
  }, [sortedParties, upvoteCounts, todayKey]);

  const hottestParty = useMemo(() => {
    if (topScore <= 0) return null;
    return (
      sortedParties.find(
        (party) =>
          berlinDayKeyFromIso(party.startsAt) >= todayKey &&
          (upvoteCounts[party.id] ?? party.upvoteCount ?? 0) === topScore,
      ) ?? null
    );
  }, [sortedParties, topScore, upvoteCounts, todayKey]);

  const hotPartyIds = useMemo(
    () => (hottestParty ? new Set([hottestParty.id]) : new Set<string>()),
    [hottestParty],
  );

  const filteredByType = useMemo(() => {
    const typeFiltered = filterDiscoverEvents(sortedParties, filter);
    const base = likedOnly ? typeFiltered.filter((party) => upvotedPartyIds.includes(party.id)) : typeFiltered;
    if (filter === "top") {
      return sortDiscoverByUpvotesDesc(base, upvoteCounts);
    }
    return base;
  }, [filter, likedOnly, sortedParties, upvoteCounts, upvotedPartyIds]);

  const searchFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredByType;
    return filteredByType.filter((e) => {
      const hay = `${e.title} ${venueLabel(e)} ${e.locationName ?? ""} ${e.vibeLabel} ${e.description ?? ""} ${e.categoryLabel ?? ""} ${e.musicGenre ?? ""} ${e.sourceBadge ?? ""}`
        .toLowerCase()
        .replace(/\s+/g, " ");
      return hay.includes(q);
    });
  }, [filteredByType, searchQuery]);

  const partiesForMap = useMemo(() => filterPartiesWithMapCoords(searchFiltered), [searchFiltered]);

  const visibleEvents = useMemo(
    () => searchFiltered.slice(0, visibleCount),
    [searchFiltered, visibleCount],
  );

  const hasMoreVisible = searchFiltered.length > visibleCount;

  const filterCounts = useMemo(() => {
    const count = (f: DiscoverFilterKey) =>
      f === "all"
        ? sortedParties.length
        : sortedParties.filter((p) => filterDiscoverEvents([p], f).length === 1).length;

    return {
      all: count("all"),
      top: count("top"),
      clubs: count("clubs"),
      daytime: count("daytime"),
      community: count("community"),
    };
  }, [sortedParties]);

  const savedCount = useMemo(
    () => parties.filter((p) => upvotedPartyIds.includes(p.id)).length,
    [parties, upvotedPartyIds],
  );

  const filterItems: Array<{ id: DiscoverFilterKey; label: string }> = [
    { id: "all", label: "Alle" },
    { id: "top", label: "Top" },
    { id: "clubs", label: "Clubs" },
    { id: "daytime", label: "Tagesevents" },
    { id: "community", label: "Community" },
  ];

  const toggleLikedFilter = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("ui", "new");
    if (likedOnly) {
      params.delete("liked");
    } else {
      params.set("liked", "1");
    }
    router.replace(`/discover?${params.toString()}`, { scroll: false });
  }, [likedOnly, router]);

  /** Vollständiger Reset: lokaler State + URL (type, liked, date), Wochenfenster bleibt erhalten. */
  const resetDiscoverV2Filters = useCallback(() => {
    setSearchQuery("");
    setFilter("all");
    setVisibleCount(LOAD_MORE_STEP);
    setViewMode("cards");
    setCalendarDate(todayKey);
    setCalendarMonth(todayKey);
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    params.set("ui", "new");
    params.delete("type");
    params.delete("liked");
    params.delete("date");
    const w = params.get("weeks");
    if (!w || !/^\d+$/.test(w)) {
      params.set("weeks", String(currentWeeks));
    }
    router.replace(`/discover?${params.toString()}`, { scroll: false });
  }, [currentWeeks, router, todayKey]);

  const handleUpvote = useCallback(
    async (eventId: string) => {
      const wasUpvoted = upvotedPartyIds.includes(eventId);
      const nextUpvoted = !wasUpvoted;
      const previousCount =
        upvoteCounts[eventId] ?? parties.find((p) => p.id === eventId)?.upvoteCount ?? 0;

      setUpvotedPartyIds((c) =>
        nextUpvoted ? Array.from(new Set([...c, eventId])) : c.filter((id) => id !== eventId),
      );
      setUpvoteCounts((c) => ({
        ...c,
        [eventId]: Math.max(0, (c[eventId] ?? 0) + (nextUpvoted ? 1 : -1)),
      }));

      try {
        const result = await togglePartyUpvote(eventId, nextUpvoted);
        setUpvoteCounts((c) => ({ ...c, [eventId]: Math.max(0, result.upvoteCount) }));
      } catch (error) {
        setUpvotedPartyIds((c) =>
          nextUpvoted ? c.filter((id) => id !== eventId) : Array.from(new Set([...c, eventId])),
        );
        setUpvoteCounts((c) => ({ ...c, [eventId]: previousCount }));
        const serviceError = asServiceError(error);
        showToast({ variant: "error", title: "Upvote fehlgeschlagen", message: serviceError.message });
      }
    },
    [parties, showToast, upvoteCounts, upvotedPartyIds],
  );

  function buildLoadMoreHref() {
    const nextWeeks = Math.min(24, currentWeeks + 4);
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    params.set("ui", "new");
    params.set("weeks", String(nextWeeks));
    return `/discover?${params.toString()}`;
  }

  return (
    <div className="min-h-screen pb-24">
      <a href="#events-feed-v2" className="skip-to-content">
        Zum Events-Bereich springen
      </a>

      <header
        className="sticky top-0 z-40 px-4 pb-4 backdrop-blur-sm"
        style={{
          paddingTop: "max(12px, env(safe-area-inset-top, 0px))",
          background: "linear-gradient(to bottom, rgba(15,11,8,0.98), rgba(15,11,8,0.92), rgba(15,11,8,0))",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="animate-slide-up min-w-0" style={{ animationDelay: "0ms" }}>
            <h1 className="sr-only">WasGehtTüb – Events entdecken</h1>
            <div aria-hidden="true" className="flex items-center">
              <Image
                src={SITE_LOGO_SRC}
                alt=""
                width={120}
                height={120}
                className="h-12 w-12 object-contain sm:h-14 sm:w-14"
                priority
              />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 animate-slide-up" style={{ animationDelay: "50ms" }}>
            <button
              type="button"
              onClick={() =>
                showToast({
                  variant: "info",
                  title: "Benachrichtigungen",
                  message: "Push-Updates sind noch in Arbeit — nutze „Ich bin dabei!“, damit du Events schnell wiederfindest.",
                })
              }
              className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-[#1A1715]/90 hover:bg-[#221d1a] transition-colors border border-[#2B2623]"
              aria-label="Infos zu Benachrichtigungen"
            >
              <Bell className="w-5 h-5 text-[#A69A91]" aria-hidden="true" />
            </button>
            <Link
              href={isAuthenticated ? "/profile" : "/auth"}
              className="relative min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={isAuthenticated ? "Profil" : "Anmelden"}
            >
              {isAuthenticated ? (
                <>
                  <span className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-foreground border-2 border-primary/40">
                    {avatarFallback}
                  </span>
                  <span
                    className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-secondary border-2 border-background"
                    aria-hidden="true"
                  />
                </>
              ) : (
                <span className="w-10 h-10 rounded-full bg-[#1A1715]/90 border-2 border-[#2B2623] flex items-center justify-center">
                  <User className="w-5 h-5 text-[#A69A91]" aria-hidden="true" />
                </span>
              )}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex-1 min-w-[min(100%,12rem)] flex items-center gap-3 px-4 py-3 bg-[#141210]/90 border border-[#2A2521] rounded-xl transition-all duration-200 focus-within:bg-[#1b1714] focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="w-4 h-4 text-[#8C8178] flex-shrink-0" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Events oder Locations suchen…"
              aria-label="Events suchen"
              className="flex-1 bg-transparent text-sm text-[#E9DFD6] placeholder:text-[#6F655D] focus:outline-none min-w-0"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[#8C8178] hover:text-[#E9DFD6] text-xs shrink-0"
              >
                Leeren
              </button>
            ) : null}
          </div>
          <div className="flex items-center bg-[#1A1715]/90 border border-[#2B2623] rounded-xl p-1" role="group" aria-label="Ansicht">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-all duration-200 ${
                viewMode === "cards" ? "bg-primary text-[#2D1D10]" : "text-[#8C8178] hover:text-[#E9DFD6]"
              }`}
              aria-label="Kartenansicht"
              aria-pressed={viewMode === "cards"}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-all duration-200 ${
                viewMode === "list" ? "bg-primary text-[#2D1D10]" : "text-[#8C8178] hover:text-[#E9DFD6]"
              }`}
              aria-label="Listenansicht"
              aria-pressed={viewMode === "list"}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-all duration-200 ${
                viewMode === "calendar" ? "bg-primary text-[#2D1D10]" : "text-[#8C8178] hover:text-[#E9DFD6]"
              }`}
              aria-label="Kalender"
              aria-pressed={viewMode === "calendar"}
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-all duration-200 ${
                viewMode === "map" ? "bg-primary text-[#2D1D10]" : "text-[#8C8178] hover:text-[#E9DFD6]"
              }`}
              aria-label="Karte"
              aria-pressed={viewMode === "map"}
            >
              <MapPin className="w-4 h-4" />
            </button>
          </div>
          <Link
            href={buildClassicDiscoverHref()}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#1A1715]/90 border border-[#2B2623] rounded-xl text-[#8C8178] hover:text-primary hover:border-primary/40 transition-all duration-200"
            aria-label="Klassische Discover-Ansicht mit erweiterten Filtern öffnen"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </Link>
        </div>

        <div
          className="flex items-center gap-2.5 mt-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
          role="tablist"
          aria-label="Kategorien"
        >
          {filterItems.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setFilter(item.id);
                setVisibleCount(LOAD_MORE_STEP);
              }}
              role="tab"
              aria-selected={filter === item.id}
              className={`flex items-center gap-2 px-4 py-2 min-h-[38px] text-sm font-medium whitespace-nowrap rounded-full transition-all duration-200 animate-slide-up ${
                filter === item.id
                  ? "bg-[#ff7a18] text-[#2D1D10] border border-[#ff9a3f] shadow-[0_8px_24px_rgba(255,122,24,0.42)]"
                  : "bg-[#1A1715]/90 border border-[#2B2623] text-[#A69A91] hover:text-[#E9DFD6] hover:border-[#3A312B]"
              }`}
              style={{ animationDelay: `${150 + i * 30}ms` }}
            >
              <span>{item.label}</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full leading-none tabular-nums ${
                  filter === item.id ? "bg-[#2D1D10]/25 text-[#2D1D10]" : "bg-[#24201D] text-[#8C8178]"
                }`}
              >
                {filterCounts[item.id]}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => toggleLikedFilter()}
            role="tab"
            aria-selected={likedOnly}
            className={`flex items-center gap-2 px-4 py-2 min-h-[38px] text-sm font-medium whitespace-nowrap rounded-full transition-all duration-200 animate-slide-up ${
              likedOnly
                ? "bg-[#ff7a18] text-[#2D1D10] border border-[#ff9a3f] shadow-[0_8px_24px_rgba(255,122,24,0.42)]"
                : "bg-[#1A1715]/90 border border-[#2B2623] text-[#A69A91] hover:text-[#E9DFD6] hover:border-[#3A312B]"
            }`}
            style={{ animationDelay: `${150 + filterItems.length * 30}ms` }}
          >
            <Heart className={`w-3.5 h-3.5 shrink-0 ${likedOnly ? "fill-current" : ""}`} aria-hidden="true" />
            <span>Gespeichert</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full leading-none tabular-nums ${likedOnly ? "bg-[#2D1D10]/25 text-[#2D1D10]" : "bg-[#24201D] text-[#8C8178]"}`}
            >
              {savedCount}
            </span>
          </button>
        </div>

        {viewMode === "cards" && hottestParty && topScore > 0 ? (
        <div className="mt-2 animate-slide-up" style={{ animationDelay: "260ms" }}>
            <Link
              href={hottestParty.detailHref}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[38px] rounded-full bg-primary text-[#2D1D10] text-sm font-semibold shadow-[0_8px_24px_rgba(255,122,24,0.35)]"
              aria-label={`Im Trend: ${hottestParty.title}`}
            >
              <Flame className="w-4 h-4" aria-hidden="true" />
              <span>Im Trend</span>
            </Link>
          </div>
        ) : null}
      </header>

      <main
        id="events-feed-v2"
        className={
          viewMode === "map" || viewMode === "calendar"
            ? "space-y-3 px-4"
            : viewMode === "cards"
              ? "space-y-4 px-4"
              : "space-y-2 px-2.5"
        }
        role={viewMode === "map" || viewMode === "calendar" ? undefined : "feed"}
        aria-label={
          viewMode === "map" ? "Karte" : viewMode === "calendar" ? "Kalender" : "Event-Feed"
        }
      >
        {viewMode === "calendar" ? (
          <DiscoverCalendarPanelV2
            events={searchFiltered}
            todayKey={todayKey}
            selectedDate={calendarDate}
            onSelectedDateChange={setCalendarDate}
            monthAnchor={calendarMonth}
            onMonthAnchorChange={setCalendarMonth}
            hotPartyIds={hotPartyIds}
            upvoteCounts={upvoteCounts}
            upvotedPartyIds={upvotedPartyIds}
            formatEventDate={formatEventDate}
            formatEventTime={formatEventTime}
            venueLabel={venueLabel}
            onUpvote={(id) => void handleUpvote(id)}
          />
        ) : viewMode === "map" ? (
          partiesForMap.length > 0 ? (
            <DiscoverMapLazy
              parties={partiesForMap}
              activeFilter={filter}
              accentMarkers={filter === "clubs"}
              containerClassName="h-[min(22rem,52vh)] w-full overflow-hidden rounded-2xl border border-border/60 bg-card/20"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-border/50 bg-card/30">
              <div className="w-14 h-14 rounded-full bg-card flex items-center justify-center mb-3 border border-border">
                <MapPin className="w-7 h-7 text-muted-foreground" />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-foreground mb-2">Keine Karteneinträge</h2>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Für die aktuelle Auswahl haben wir keine Position auf der Karte. Passe Suche oder Filter an, oder nutze die
                Listenansicht.
              </p>
            </div>
          )
        ) : visibleEvents.length > 0 ? (
          viewMode === "cards" ? (
            visibleEvents.map((event, index) => (
              <DiscoverEventCardV2
                key={event.id}
                event={event}
                index={index}
                isHot={hotPartyIds.has(event.id)}
                upvoteCount={upvoteCounts[event.id] ?? event.upvoteCount ?? 0}
                upvotedByMe={upvotedPartyIds.includes(event.id)}
                dateLabel={formatEventDate(event.startsAt)}
                timeLabel={formatEventTime(event.startsAt)}
                venueLabel={venueLabel(event)}
                onUpvote={() => void handleUpvote(event.id)}
              />
            ))
          ) : (
            visibleEvents.map((event, index) => (
              <DiscoverEventListItemV2
                key={event.id}
                event={event}
                index={index}
                isHot={hotPartyIds.has(event.id)}
                upvoteCount={upvoteCounts[event.id] ?? event.upvoteCount ?? 0}
                upvotedByMe={upvotedPartyIds.includes(event.id)}
                dateLabel={formatEventDate(event.startsAt)}
                timeLabel={formatEventTime(event.startsAt)}
                venueLabel={venueLabel(event)}
                onUpvote={() => void handleUpvote(event.id)}
              />
            ))
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4 border border-border">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground mb-2">Keine Events gefunden</h2>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              Passe Suche oder Filter an, nutze die Kalender- oder Kartenansicht oben, oder setze alle Filter zurück.
            </p>
            <button
              type="button"
              onClick={() => resetDiscoverV2Filters()}
              className="mt-6 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full editorial-shadow hover:opacity-90 transition-opacity"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}

        {viewMode !== "map" && viewMode !== "calendar" && hasMoreVisible ? (
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + LOAD_MORE_STEP)}
              className="px-5 py-2.5 rounded-full border border-border bg-card/50 text-sm font-medium text-foreground hover:bg-card"
            >
              Mehr anzeigen
            </button>
          </div>
        ) : null}

        {viewMode !== "map" && viewMode !== "calendar" && canLoadMore && !hasMoreVisible && searchFiltered.length > 0 ? (
          <div className="flex justify-center pt-6">
            <button
              type="button"
              onClick={() => router.replace(buildLoadMoreHref(), { scroll: false })}
              className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full editorial-shadow hover:opacity-90 transition-opacity text-sm"
            >
              Mehr Wochen laden
            </button>
          </div>
        ) : null}
      </main>

      <DiscoverBottomNavV2
        activeTab={viewMode === "map" ? "map" : "discover"}
        onSelectDiscover={() => {
          setViewMode("cards");
          window.requestAnimationFrame(() => {
            document.getElementById("events-feed-v2")?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }}
        onSelectMap={() => setViewMode("map")}
      />
    </div>
  );
}
