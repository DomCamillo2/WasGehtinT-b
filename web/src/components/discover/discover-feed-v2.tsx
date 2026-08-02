"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Download,
  Heart,
  LayoutGrid,
  List,
  Loader2,
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
import type { PartyCard } from "@/lib/types";
import type { DiscoverViewMode } from "@/services/discover/discover-page-service";
import type { DiscoverEvent } from "@/services/discover/discover-view-model";
import { SITE_LOGO_SRC } from "@/lib/site-config";
import { togglePartyUpvote } from "@/services/events/upvotes-service";
import { LegalLinks } from "@/components/layout/legal-links";
import { DiscoverBottomNavV2 } from "./discover-bottom-nav-v2";
import { DiscoverCalendarPanelV2 } from "./discover-calendar-panel-v2";
import { DiscoverEventCardV2 } from "./discover-event-card-v2";
import { DiscoverEventListItemV2 } from "./discover-event-list-item-v2";
import { DiscoverFeedScrollItem } from "./discover-feed-scroll-item";
import {
  AnimatePresence,
  DiscoverMotionRoot,
  enterTransition,
  exitTransition,
  m,
  useReducedMotion,
} from "@/lib/discover-motion";

const DiscoverMapLazy = dynamic(
  () => import("@/components/party/discover-map").then((m) => m.DiscoverMap),
  { ssr: false },
);

const LOCAL_UPVOTED_EVENTS_KEY = "wasgeht-upvoted-events-v1";
const LOAD_MORE_STEP = 24;
const INSTALL_DISMISSED_KEY = "wasgeht-install-dismissed-v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

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
  initialView: DiscoverViewMode;
  initialFilter: DiscoverFilterKey;
  initialCalendarDate?: string;
};

function resolveSeedCalendarDate(urlDate: string | null, init: string | undefined, today: string): string {
  if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) return urlDate;
  if (init && /^\d{4}-\d{2}-\d{2}$/.test(init)) return init;
  return today;
}

/** Mirrors server parsing in `discover-page-service` so URL and client state stay aligned. */
function parseFilterFromDiscoverUrl(params: URLSearchParams): DiscoverFilterKey {
  const t = params.get("type");
  if (t === "community" || t === "top" || t === "clubs" || t === "daytime" || t === "all") {
    return t;
  }
  return "all";
}

function parseViewFromDiscoverUrl(params: URLSearchParams): DiscoverViewMode {
  const raw = params.get("view");
  if (raw === "cards" || raw === "list" || raw === "calendar" || raw === "map") {
    return raw;
  }
  return "cards";
}

function parseSearchFromDiscoverUrl(params: URLSearchParams): string {
  const raw = params.get("q");
  return typeof raw === "string" ? raw : "";
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

function discoverEventToPartyCardForHero(e: DiscoverEvent): PartyCard {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    starts_at: e.startsAt,
    ends_at: e.endsAt,
    max_guests: e.maxGuests,
    contribution_cents: e.contributionCents,
    public_lat: e.publicLat,
    public_lng: e.publicLng,
    is_external: e.isExternal,
    external_link: e.externalLink,
    vibe_label: e.vibeLabel ?? "",
    spots_left: e.spotsLeft,
    location_name: e.locationName,
    music_genre: e.musicGenre,
    category_slug: e.categorySlug,
    category_label: e.categoryLabel,
    event_scope: e.eventScope ?? undefined,
    is_community: e.isCommunity,
    hero_image_url: e.heroImageUrl,
  };
}

export function DiscoverFeedV2({
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
  const searchParams = useSearchParams();
  const discoverUrlSignature = searchParams.toString();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<DiscoverFilterKey>(initialFilter);
  const [searchQuery, setSearchQuery] = useState(() => parseSearchFromDiscoverUrl(searchParams));
  /** Debounced value pushed to the URL as `q` (see backlog P0 — avoids router.replace on every keystroke). */
  const [debouncedSearchForUrl, setDebouncedSearchForUrl] = useState(() =>
    parseSearchFromDiscoverUrl(searchParams).trim(),
  );
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const weeksSentinelRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<DiscoverViewMode>(() => {
    const raw = searchParams.get("view");
    if (raw === "cards" || raw === "list" || raw === "calendar" || raw === "map") {
      return raw;
    }
    return initialView;
  });
  const [visibleCount, setVisibleCount] = useState(LOAD_MORE_STEP);
  /** Pexels hero URLs loaded after first paint so discover SSR is not blocked. */
  const [clientHeroUrls, setClientHeroUrls] = useState<Record<string, string>>({});
  const heroImageRequestRef = useRef(new Set<string>());

  const todayKey = useMemo(() => berlinDayKeyFromIso(new Date().toISOString()), []);

  const [calendarDate, setCalendarDate] = useState(() =>
    resolveSeedCalendarDate(searchParams.get("date"), initialCalendarDate, todayKey),
  );
  const [calendarMonth, setCalendarMonth] = useState(() =>
    resolveSeedCalendarDate(searchParams.get("date"), initialCalendarDate, todayKey),
  );
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [weeksNavPending, setWeeksNavPending] = useState(false);

  const likedOnly = searchParams.get("liked") === "1";

  /** When filter/view/liked in the URL change (history, deep link), reset “Mehr anzeigen” — not on date-only changes. */
  const feedControlSignatureRef = useRef<string | null>(null);

  /** Keep view, category filter, and calendar selection aligned with the URL (back/forward, shared links). */
  useEffect(() => {
    const params = new URLSearchParams(discoverUrlSignature);
    const fromUrlView = parseViewFromDiscoverUrl(params);
    const fromUrlFilter = parseFilterFromDiscoverUrl(params);
    const likedKey = params.get("liked") === "1" ? "1" : "";
    const q = parseSearchFromDiscoverUrl(params).trim().toLowerCase();
    const controlSig = `${fromUrlFilter}|${fromUrlView}|${likedKey}|${q}`;
    if (feedControlSignatureRef.current !== null && feedControlSignatureRef.current !== controlSig) {
      setVisibleCount(LOAD_MORE_STEP);
    }
    feedControlSignatureRef.current = controlSig;

    setViewMode((prev) => (prev === fromUrlView ? prev : fromUrlView));
    setFilter((prev) => (prev === fromUrlFilter ? prev : fromUrlFilter));
    const fromUrlSearch = parseSearchFromDiscoverUrl(params);
    setSearchQuery((prev) => (prev === fromUrlSearch ? prev : fromUrlSearch));
    setDebouncedSearchForUrl(fromUrlSearch.trim());

    const rawDate = params.get("date");
    const validDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;
    if (validDate) {
      setCalendarDate((prev) => (prev === validDate ? prev : validDate));
      setCalendarMonth((prev) => (prev === validDate ? prev : validDate));
    }
  }, [discoverUrlSignature]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) {
      setDebouncedSearchForUrl("");
      return;
    }
    const id = window.setTimeout(() => setDebouncedSearchForUrl(trimmed), 320);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => {
    let ticking = false;
    const applyCompact = () => {
      ticking = false;
      const compact = window.scrollY > 96;
      const el = headerRef.current;
      if (!el) return;
      if (compact) {
        if (!el.hasAttribute("data-compact")) el.setAttribute("data-compact", "");
      } else if (el.hasAttribute("data-compact")) {
        el.removeAttribute("data-compact");
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(applyCompact);
    };
    applyCompact();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  /** If the event list grows (same session) merge any saved IDs from storage that now exist in `parties`. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const known = new Set(parties.map((p) => p.id));
    try {
      const raw = window.localStorage.getItem(LOCAL_UPVOTED_EVENTS_KEY);
      if (!raw) return;
      const storedIds = JSON.parse(raw) as unknown;
      if (!Array.isArray(storedIds)) return;
      const valid = storedIds.filter((id): id is string => typeof id === "string" && known.has(id));
      if (valid.length === 0) return;
      setUpvotedPartyIds((prev) => {
        const merged = Array.from(new Set([...prev, ...valid]));
        return merged.length === prev.length ? prev : merged;
      });
    } catch {
      /* ignore */
    }
  }, [parties]);

  useEffect(() => {
    const missing = parties.filter(
      (p) => !p.heroImageUrl && !clientHeroUrls[p.id] && !heroImageRequestRef.current.has(p.id),
    );
    const batch = missing.slice(0, 48);
    if (!batch.length) return;

    for (const p of batch) {
      heroImageRequestRef.current.add(p.id);
    }

    const ac = new AbortController();
    const releaseBatch = () => {
      for (const p of batch) {
        heroImageRequestRef.current.delete(p.id);
      }
    };

    void (async () => {
      try {
        const res = await fetch("/api/discover/hero-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parties: batch.map(discoverEventToPartyCardForHero) }),
          signal: ac.signal,
        });
        if (!res.ok) {
          releaseBatch();
          return;
        }
        const data = (await res.json()) as { ok?: boolean; heroes?: Record<string, string> };
        const heroes = data.heroes;
        if (!data.ok || !heroes) {
          releaseBatch();
          return;
        }
        setClientHeroUrls((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const [id, url] of Object.entries(heroes)) {
            if (typeof url === "string" && url.length > 0 && next[id] !== url) {
              next[id] = url;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      } catch {
        if (!ac.signal.aborted) {
          releaseBatch();
        }
      }
    })();

    return () => {
      ac.abort();
      releaseBatch();
    };
  }, [parties, clientHeroUrls]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_UPVOTED_EVENTS_KEY, JSON.stringify(upvotedPartyIds));
    } catch {
      /* ignore */
    }
  }, [upvotedPartyIds]);

  useEffect(() => {
    try {
      setInstallDismissed(window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "1");
    } catch {
      setInstallDismissed(false);
    }
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("discover-v2-scroll-enhanced");
    return () => {
      document.documentElement.classList.remove("discover-v2-scroll-enhanced");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || pathname !== "/discover") return;
    const params = new URLSearchParams(window.location.search);
    params.set("ui", "new");
    const trimmedQuery = debouncedSearchForUrl;
    if (trimmedQuery.length > 0) params.set("q", trimmedQuery);
    else params.delete("q");
    if (filter !== "all") params.set("type", filter);
    else params.delete("type");
    if (viewMode === "calendar") {
      params.set("date", calendarDate);
    } else {
      params.delete("date");
    }
    if (viewMode === "cards") {
      params.delete("view");
    } else {
      params.set("view", viewMode);
    }
    const nextHref = `/discover?${params.toString()}`;
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (currentHref !== nextHref) {
      router.replace(nextHref, { scroll: false });
    }
  }, [filter, viewMode, calendarDate, pathname, router, debouncedSearchForUrl]);

  useEffect(() => {
    setWeeksNavPending(false);
  }, [currentWeeks]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (viewMode === "map" || viewMode === "calendar") return;
    const el = weeksSentinelRef.current;
    if (!el || !canLoadMore || hasMoreVisible || searchFiltered.length === 0 || weeksNavPending) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setWeeksNavPending(true);
        const nextWeeks = Math.min(24, currentWeeks + 4);
        const p = new URLSearchParams(window.location.search);
        p.set("ui", "new");
        p.set("weeks", String(nextWeeks));
        router.replace(`/discover?${p.toString()}`, { scroll: false });
      },
      { root: null, rootMargin: "160px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [
    canLoadMore,
    currentWeeks,
    hasMoreVisible,
    router,
    searchFiltered.length,
    viewMode,
    weeksNavPending,
  ]);

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

  const filterItems: Array<{ id: DiscoverFilterKey; label: string }> = [
    { id: "all", label: "Alle" },
    { id: "top", label: "Top" },
    { id: "clubs", label: "Clubs" },
    { id: "daytime", label: "Tagesevents" },
    { id: "community", label: "Community" },
  ];

  const viewModeToggleActive =
    "bg-[#221e1a] text-[#c4783a] border border-[rgba(240,235,228,0.14)]";
  const viewModeToggleInactive = "border border-transparent text-[#9a9086] hover:text-[#f0ebe4]";

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

  const navigateBottomNavDiscover = useCallback(() => {
    setViewMode("cards");
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("ui", "new");
      params.delete("liked");
      params.delete("date");
      params.delete("view");
      router.replace(`/discover?${params.toString()}`, { scroll: false });
    });
  }, [router]);

  const navigateBottomNavSaved = useCallback(() => {
    setViewMode("cards");
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("ui", "new");
      params.set("liked", "1");
      params.delete("date");
      params.delete("view");
      router.replace(`/discover?${params.toString()}`, { scroll: false });
    });
  }, [router]);

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
    params.delete("q");
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

  async function handleInstallApp() {
    if (installPromptEvent) {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPromptEvent(null);
        return;
      }
    }

    showToast({
      variant: "info",
      title: "App installieren",
      message:
        "Browser-Menü öffnen und „App installieren“ bzw. „Zum Startbildschirm“ wählen. In iOS Safari: Teilen → Zum Home-Bildschirm.",
    });
  }

  function dismissInstallHint() {
    setInstallDismissed(true);
    try {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  }

  const reduceMotion = useReducedMotion();

  return (
    <DiscoverMotionRoot>
    <div className="min-h-screen pb-28 max-sm:pb-[9.5rem]">
      <div className="overflow-x-clip">
      <a href="#events-feed-v2" className="skip-to-content">
        Zum Events-Bereich springen
      </a>

      <header
        ref={headerRef}
        className="discover-header-glass sticky top-0 z-40 px-4"
        style={{
          paddingTop: "max(12px, env(safe-area-inset-top, 0px))",
        }}
      >
        <div className="discover-header-brand-row flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="sr-only">WasGehtTüb – Events entdecken</h1>
            <div aria-hidden="true" className="flex items-center gap-2.5">
              <Image
                src={SITE_LOGO_SRC}
                alt=""
                width={120}
                height={120}
                className="discover-header-logo object-contain"
                priority
              />
              <div className="min-w-0">
                <p className="font-wordmark truncate text-xl leading-none tracking-tight text-[#f0ebe4] sm:text-2xl">
                  WasGeht<span className="text-[#c4783a]">Tüb</span>
                </p>
                <p className="discover-header-tagline hidden truncate text-[12px] text-[#9a9086] sm:block">
                  Was geht heut’ in Tübingen?
                </p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!installDismissed ? (
              <button
                type="button"
                onClick={() => void handleInstallApp()}
                onContextMenu={(event) => {
                  event.preventDefault();
                  dismissInstallHint();
                }}
                className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-md border border-[rgba(240,235,228,0.12)] bg-[#1c1815] px-3 text-xs font-semibold text-[#f0ebe4] transition-colors hover:bg-[#221e1a]"
                aria-label="App installieren"
                title="App installieren (Rechtsklick/Langdruck zum Ausblenden)"
              >
                <Download className="h-4 w-4 text-[#c4783a]" aria-hidden="true" />
                <span className="hidden sm:inline">App</span>
              </button>
            ) : null}
            <Link
              href={isAuthenticated ? "/profile" : "/auth"}
              className="relative min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={isAuthenticated ? "Profil" : "Anmelden"}
            >
              {isAuthenticated ? (
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[rgba(240,235,228,0.14)] bg-[#221e1a] text-sm font-semibold text-foreground">
                  {avatarFallback}
                </span>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[rgba(240,235,228,0.12)] bg-[#1c1815]">
                  <User className="h-5 w-5 text-[#9a9086]" aria-hidden="true" />
                </span>
              )}
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex w-full min-w-0 flex-1 items-center gap-3 rounded-md border border-[rgba(240,235,228,0.12)] bg-[#1c1815] px-4 py-3 transition-colors duration-150 focus-within:border-[rgba(196,120,58,0.45)] sm:min-w-[min(100%,12rem)]">
            <Search className="h-4 w-4 shrink-0 text-[#9a9086]" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Events oder Locations suchen…"
              aria-label="Events suchen"
              id="discover-v2-search"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#f0ebe4] placeholder:text-[#6f675f] focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="shrink-0 text-xs text-[#9a9086] hover:text-[#f0ebe4]"
              >
                Leeren
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-[rgba(240,235,228,0.12)] bg-[#1c1815] p-0.5" role="group" aria-label="Ansicht">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors duration-150 sm:min-h-[36px] sm:min-w-[36px] ${
                viewMode === "cards" ? viewModeToggleActive : viewModeToggleInactive
              }`}
              aria-label="Kartenansicht"
              aria-pressed={viewMode === "cards"}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors duration-150 sm:min-h-[36px] sm:min-w-[36px] ${
                viewMode === "list" ? viewModeToggleActive : viewModeToggleInactive
              }`}
              aria-label="Listenansicht"
              aria-pressed={viewMode === "list"}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors duration-150 sm:min-h-[36px] sm:min-w-[36px] ${
                viewMode === "calendar" ? viewModeToggleActive : viewModeToggleInactive
              }`}
              aria-label="Kalender"
              aria-pressed={viewMode === "calendar"}
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors duration-150 sm:min-h-[36px] sm:min-w-[36px] ${
                viewMode === "map" ? viewModeToggleActive : viewModeToggleInactive
              }`}
              aria-label="Karte"
              aria-pressed={viewMode === "map"}
            >
              <MapPin className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[rgba(240,235,228,0.12)] bg-[#1c1815] text-[#9a9086] transition-colors duration-150 hover:border-[rgba(240,235,228,0.22)] hover:text-[#c4783a] sm:hidden"
            aria-label="Mehr Filter und klassische Ansicht"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
          <Link
            href={buildClassicDiscoverHref()}
            className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[rgba(240,235,228,0.12)] bg-[#1c1815] text-[#9a9086] transition-colors duration-150 hover:border-[rgba(240,235,228,0.22)] hover:text-[#c4783a] sm:flex"
            aria-label="Klassische Discover-Ansicht mit erweiterten Filtern öffnen"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </Link>
          </div>
        </div>

        <div
          className="discover-header-chips flex snap-x snap-proximity scroll-pb-1 items-center gap-2.5 overflow-x-auto overscroll-x-contain pb-2 -mx-4 px-4 scrollbar-hide"
          role="tablist"
          aria-label="Kategorien"
        >
          {filterItems.map((item) => {
            const active = !likedOnly && filter === item.id;
            return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setFilter(item.id);
                setVisibleCount(LOAD_MORE_STEP);
              }}
              role="tab"
              aria-selected={active}
              className={`wg-interactive wg-pressable relative snap-start shrink-0 flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium sm:min-h-[32px] sm:text-sm ${
                active
                  ? "border-[#c4783a] bg-[#221e1a] text-[#f0ebe4]"
                  : "border-[rgba(240,235,228,0.12)] bg-transparent text-[#9a9086] hover:border-[rgba(240,235,228,0.22)] hover:text-[#f0ebe4]"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`text-[10px] leading-none tabular-nums sm:text-[11px] ${
                  active ? "text-[#c4783a]" : "text-[#6f675f]"
                }`}
              >
                {filterCounts[item.id]}
              </span>
            </button>
            );
          })}
          <button
            type="button"
            onClick={() => toggleLikedFilter()}
            role="tab"
            aria-selected={likedOnly}
            className={`wg-interactive wg-pressable relative snap-start shrink-0 flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium sm:min-h-[32px] sm:text-sm ${
              likedOnly
                ? "border-[#c4783a] bg-[#221e1a] text-[#f0ebe4]"
                : "border-[rgba(240,235,228,0.12)] bg-transparent text-[#9a9086] hover:border-[rgba(240,235,228,0.22)] hover:text-[#f0ebe4]"
            }`}
          >
            <Heart
              className={`h-3.5 w-3.5 ${likedOnly ? "fill-[#c4783a] text-[#c4783a]" : "text-[#9a9086]"}`}
              aria-hidden="true"
            />
            <span>Gemerkt</span>
          </button>
        </div>
      </header>

      <main
        id="events-feed-v2"
        className={
          viewMode === "map" || viewMode === "calendar"
            ? "space-y-3 px-4"
            : viewMode === "cards"
              ? "px-0"
              : "px-2.5"
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
              containerClassName="h-[min(22rem,52vh)] w-full overflow-hidden rounded-lg border border-[rgba(240,235,228,0.12)] bg-[#1c1815]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-[rgba(240,235,228,0.12)] bg-[#1c1815] px-4 py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center border border-[rgba(240,235,228,0.12)] bg-[#221e1a]">
                <MapPin className="h-7 w-7 text-[#9a9086]" />
              </div>
              <h2 className="mb-2 font-wordmark text-xl tracking-tight text-[#f0ebe4]">Keine Karteneinträge</h2>
              <p className="max-w-[280px] text-sm text-[#9a9086]">
                Für diese Auswahl gibt’s keine Position — Filter anpassen oder die Liste nutzen.
              </p>
            </div>
          )
        ) : visibleEvents.length > 0 ? (
          viewMode === "cards" ? (
            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 md:max-w-[min(100%,80rem)] md:mx-auto">
              {visibleEvents.map((event, index) => (
                <DiscoverFeedScrollItem key={event.id} variant="card" scrollSnap>
                  <DiscoverEventCardV2
                    event={{ ...event, heroImageUrl: clientHeroUrls[event.id] ?? event.heroImageUrl }}
                    imagePriority={index < 4}
                    isHot={hotPartyIds.has(event.id)}
                    upvoteCount={upvoteCounts[event.id] ?? event.upvoteCount ?? 0}
                    upvotedByMe={upvotedPartyIds.includes(event.id)}
                    dateLabel={formatEventDate(event.startsAt)}
                    timeLabel={formatEventTime(event.startsAt)}
                    venueLabel={venueLabel(event)}
                    onUpvote={() => void handleUpvote(event.id)}
                  />
                </DiscoverFeedScrollItem>
              ))}
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2 md:gap-3 md:max-w-[min(100%,80rem)] md:mx-auto">
              {visibleEvents.map((event) => (
                <DiscoverFeedScrollItem key={event.id} variant="list">
                  <DiscoverEventListItemV2
                    event={{ ...event, heroImageUrl: clientHeroUrls[event.id] ?? event.heroImageUrl }}
                    isHot={hotPartyIds.has(event.id)}
                    upvoteCount={upvoteCounts[event.id] ?? event.upvoteCount ?? 0}
                    upvotedByMe={upvotedPartyIds.includes(event.id)}
                    dateLabel={formatEventDate(event.startsAt)}
                    timeLabel={formatEventTime(event.startsAt)}
                    venueLabel={venueLabel(event)}
                    onUpvote={() => void handleUpvote(event.id)}
                  />
                </DiscoverFeedScrollItem>
              ))}
            </div>
          )
        ) : likedOnly && filteredByType.length === 0 ? (
          <div
            className="wg-empty-enter flex flex-col items-center justify-center py-20 px-4 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center border border-[rgba(240,235,228,0.12)] bg-[#1c1815]">
              <Heart className="h-7 w-7 text-[#9a9086]" aria-hidden="true" />
            </div>
            <h2 className="mb-2 font-wordmark text-xl tracking-tight text-[#f0ebe4]">Noch nichts gemerkt</h2>
            <p className="max-w-[280px] text-sm text-[#9a9086]">
              Tippe bei einem Event auf „Ich bin dabei!“ — so findest du deinen Abend in Tübingen wieder.
            </p>
            <button
              type="button"
              onClick={() => navigateBottomNavDiscover()}
              className="mt-6 min-h-[44px] rounded-md bg-[#c4783a] px-5 py-2.5 text-sm font-semibold text-[#1c1410] transition-opacity hover:opacity-90"
            >
              Events entdecken
            </button>
          </div>
        ) : (
          <div
            className="wg-empty-enter flex flex-col items-center justify-center py-20 px-4 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center border border-[rgba(240,235,228,0.12)] bg-[#1c1815]">
              <Search className="h-7 w-7 text-[#9a9086]" />
            </div>
            <h2 className="mb-2 font-wordmark text-xl tracking-tight text-[#f0ebe4]">Keine Events gefunden</h2>
            <p className="max-w-[280px] text-sm text-[#9a9086]">
              Filter lockern, Kalender oder Karte nutzen — oder zurück zu allen Abenden in Tübingen.
            </p>
            <button
              type="button"
              onClick={() => resetDiscoverV2Filters()}
              className="mt-6 min-h-[44px] rounded-md bg-[#c4783a] px-5 py-2.5 text-sm font-semibold text-[#1c1410] transition-opacity hover:opacity-90"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}

        {viewMode !== "map" && viewMode !== "calendar" && hasMoreVisible ? (
          <div className="flex justify-center scroll-mt-8 pt-4 pb-2 max-sm:scroll-mb-40 max-sm:pb-6">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + LOAD_MORE_STEP)}
              className="min-h-[44px] rounded-md border border-[rgba(240,235,228,0.12)] bg-[#1c1815] px-5 py-2.5 text-sm font-medium text-[#f0ebe4] hover:border-[rgba(240,235,228,0.22)]"
            >
              Mehr anzeigen
            </button>
          </div>
        ) : null}

        {viewMode !== "map" && viewMode !== "calendar" && canLoadMore && !hasMoreVisible && searchFiltered.length > 0 ? (
          <>
            <div ref={weeksSentinelRef} className="h-2 w-full shrink-0" aria-hidden="true" />
          <div className="flex justify-center scroll-mt-8 pt-6 pb-2 max-sm:scroll-mb-40 max-sm:pb-8">
            <button
              type="button"
              disabled={weeksNavPending}
              onClick={() => {
                setWeeksNavPending(true);
                router.replace(buildLoadMoreHref(), { scroll: false });
              }}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-[#c4783a] px-5 py-2.5 text-sm font-semibold text-[#1c1410] transition-opacity hover:opacity-90 disabled:opacity-70"
            >
              {weeksNavPending ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
              ) : null}
              {weeksNavPending ? "Lade weitere Wochen …" : "Mehr Wochen laden"}
            </button>
          </div>
          </>
        ) : null}
      </main>
      </div>

      <button
        type="button"
        className="fixed bottom-[7.25rem] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-md border border-[rgba(240,235,228,0.14)] bg-[#1c1815] text-[#f0ebe4] transition-colors hover:border-[rgba(196,120,58,0.45)] hover:text-[#c4783a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4783a]/40 sm:hidden"
        onClick={() => {
          searchInputRef.current?.focus();
          window.requestAnimationFrame(() => {
            document.getElementById("discover-v2-search")?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        }}
        aria-label="Suche öffnen"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>

      <AnimatePresence>
      {filterSheetOpen ? (
        <m.div
          key="discover-filter-sheet"
          className="fixed inset-0 z-[60] sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discover-filter-sheet-title"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={exitTransition(reduceMotion)}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Schließen"
            onClick={() => setFilterSheetOpen(false)}
          />
          <m.div
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-lg border border-[rgba(240,235,228,0.12)] bg-[#14110f] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            initial={reduceMotion ? false : { y: 28 }}
            animate={{ y: 0 }}
            exit={{ y: 18 }}
            transition={enterTransition(reduceMotion)}
          >
            <div className="mx-auto mb-3 h-0.5 w-10 bg-[#3a312b]" aria-hidden="true" />
            <h2 id="discover-filter-sheet-title" className="font-wordmark text-lg text-[#f0ebe4]">
              Mehr Optionen
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#9a9086]">
              Erweiterte Filter und die klassische Discover-Ansicht mit allen Steuerungen.
            </p>
            <Link
              href={buildClassicDiscoverHref()}
              onClick={() => setFilterSheetOpen(false)}
              className="mt-5 flex min-h-[44px] w-full items-center justify-center rounded-md bg-[#c4783a] px-4 text-sm font-semibold text-[#1c1410] wg-pressable"
            >
              Klassische Discover-Ansicht
            </Link>
            <button
              type="button"
              className="mt-3 w-full min-h-[44px] rounded-md border border-[rgba(240,235,228,0.12)] bg-[#1c1815] py-3 text-sm font-medium text-[#f0ebe4] wg-pressable"
              onClick={() => setFilterSheetOpen(false)}
            >
              Schließen
            </button>
          </m.div>
        </m.div>
      ) : null}
      </AnimatePresence>

      <div className="mx-auto max-w-md px-4 pb-3 pt-6">
        <LegalLinks className="text-[#6f675f] [&_a]:text-[#9a9086] [&_a]:decoration-[#6f675f]/50 [&_a:hover]:text-[#f0ebe4]" />
      </div>

      <DiscoverBottomNavV2
        activeTab={likedOnly ? "saved" : "discover"}
        onSelectDiscover={navigateBottomNavDiscover}
        onSelectSaved={navigateBottomNavSaved}
      />
    </div>
    </DiscoverMotionRoot>
  );
}
