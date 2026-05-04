"use client";

import dynamic from "next/dynamic";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronUp,
  Download,
  Flame,
  Heart,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  MoreHorizontal,
  Search,
  User,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { berlinDayKeyFromIso, discoverFeedSectionForEvent } from "@/lib/discover-calendar";
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
import { DiscoverBottomNavV2 } from "./discover-bottom-nav-v2";
import { DiscoverEventCardV2 } from "./discover-event-card-v2";
import { DiscoverEventListItemV2 } from "./discover-event-list-item-v2";
import { DiscoverFeedScrollItem } from "./discover-feed-scroll-item";

const DiscoverMapLazy = dynamic(
  () => import("@/components/party/discover-map").then((m) => m.DiscoverMap),
  { ssr: false },
);

const DiscoverCalendarPanelLazy = dynamic(
  () => import("./discover-calendar-panel-v2").then((m) => ({ default: m.DiscoverCalendarPanelV2 })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[14rem] items-center justify-center rounded-2xl border border-[#2a221d] bg-[#17120f]"
        role="status"
        aria-live="polite"
        aria-label="Kalender wird geladen"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary/80" aria-hidden="true" />
      </div>
    ),
  },
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
  const [headerCompact, setHeaderCompact] = useState(false);
  const [viewExtrasOpen, setViewExtrasOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
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
  /** Hide install CTA when already running as installed PWA (Chrome / Android / iOS standalone). */
  const [isStandaloneDisplay, setIsStandaloneDisplay] = useState(false);
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
    const onScroll = () => {
      const y = window.scrollY;
      setHeaderCompact(y > 96);
      setShowScrollTop(y > 360);
    };
    onScroll();
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
    const onAppInstalled = () => {
      setInstallPromptEvent(null);
    };
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(display-mode: standalone)");
    const syncStandalone = () => {
      const nav = window.navigator as Navigator & { standalone?: boolean };
      setIsStandaloneDisplay(mq.matches === true || nav.standalone === true);
    };
    syncStandalone();
    mq.addEventListener("change", syncStandalone);
    return () => mq.removeEventListener("change", syncStandalone);
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

  /** Berlin week sections — reduces scroll fatigue vs one endless list (mobile UX). */
  const discoverGroupedSections = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, { label: string; events: DiscoverEvent[] }>();
    for (const event of visibleEvents) {
      const { sectionKey, label } = discoverFeedSectionForEvent(event.startsAt, todayKey);
      const bucket = map.get(sectionKey);
      if (!bucket) {
        map.set(sectionKey, { label, events: [event] });
        order.push(sectionKey);
      } else {
        bucket.events.push(event);
      }
    }
    return order.map((key) => {
      const b = map.get(key)!;
      return { sectionKey: key, label: b.label, events: b.events };
    });
  }, [visibleEvents, todayKey]);

  /** First four cards in the feed (across week sections) get image priority for LCP. */
  const discoverGroupedWithCardPriority = useMemo(() => {
    let idx = 0;
    return discoverGroupedSections.map((section) => ({
      sectionKey: section.sectionKey,
      label: section.label,
      events: section.events.map((event) => {
        const imagePriority = idx < 4;
        idx += 1;
        return { event, imagePriority };
      }),
    }));
  }, [discoverGroupedSections]);

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

  const viewModeToggleActive =
    "border border-[#ff9a3f] bg-[#ff7a18] text-[#2D1D10] shadow-[0_4px_14px_rgba(255,122,24,0.38)]";
  const viewModeToggleInactive = "border border-transparent text-[#8C8178] hover:text-[#E9DFD6]";

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
    const params = new URLSearchParams(window.location.search);
    params.set("ui", "new");
    params.delete("liked");
    params.delete("date");
    params.delete("view");
    router.replace(`/discover?${params.toString()}`, { scroll: false });
    setViewMode("cards");
    window.requestAnimationFrame(() => {
      document.getElementById("events-feed-v2")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [router]);

  const navigateBottomNavSaved = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("ui", "new");
    params.set("liked", "1");
    params.delete("date");
    params.delete("view");
    router.replace(`/discover?${params.toString()}`, { scroll: false });
    setViewMode("cards");
    window.requestAnimationFrame(() => {
      document.getElementById("events-feed-v2")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        // Do not replace the displayed count with `result.upvoteCount`: that value is the raw
        // `event_upvotes` row count. Discover SSR applies traffic-based baselines (see
        // `applyTrafficBasedUpvoteEstimates`), so overwriting would collapse e.g. "78 dabei" → "2 dabei".
        // Optimistic (+1 / -1) above already matches the user's action on that baseline.
        if (result.upvoted !== nextUpvoted) {
          setUpvotedPartyIds((c) =>
            nextUpvoted ? c.filter((id) => id !== eventId) : Array.from(new Set([...c, eventId])),
          );
          setUpvoteCounts((c) => ({ ...c, [eventId]: previousCount }));
        }
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
    const deferred = installPromptEvent;
    if (deferred) {
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } catch {
        showToast({
          variant: "info",
          title: "App installieren",
          message:
            "Nutze das Browser-Menü (⋮ oder ☰) → „App installieren“ / „Installieren“. In Chromium oft auch das Computersymbol in der Adresszeile.",
        });
      } finally {
        // Deferred prompt is one-shot; always clear so we never call prompt() twice on the same event.
        setInstallPromptEvent(null);
      }
      return;
    }

    const isIOS =
      typeof navigator !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    showToast({
      variant: "info",
      title: "App installieren",
      message: isIOS
        ? "Safari: Teilen (□↑) → „Zum Home-Bildschirm“. Dort kannst du Name und Icon anpassen."
        : "Menü öffnen (⋮ oder ☰) → „App installieren“ oder „Als App installieren“. Oder in der Adresszeile auf das Install-Symbol tippen, sobald der Browser es anbietet.",
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

  return (
    <div className="min-h-screen pb-28 max-sm:pb-[9.5rem]">
      <div className="overflow-x-clip">
      <a href="#events-feed-v2" className="skip-to-content">
        Zum Events-Bereich springen
      </a>

      <header
        className={`discover-header-glass relative z-40 border-b border-[#2a2623]/85 bg-[#0f0b08]/97 px-3 shadow-[0_12px_32px_-22px_rgba(0,0,0,0.55)] backdrop-blur-md backdrop-saturate-150 motion-safe:transition-[padding] motion-safe:duration-200 sm:sticky sm:top-0 sm:px-4 ${
          headerCompact ? "pb-2 sm:pb-2" : "pb-3 sm:pb-4"
        }`}
        style={{
          paddingTop: "max(8px, env(safe-area-inset-top, 0px))",
        }}
      >
        <div
          className={`flex items-center justify-between motion-safe:transition-[margin] motion-safe:duration-200 ${headerCompact ? "mb-2 sm:mb-2" : "mb-2.5 sm:mb-4"}`}
        >
          <div className="min-w-0">
            <h1 className="sr-only">WasGehtTüb – Events entdecken</h1>
            <div aria-hidden="true" className="flex items-center gap-2">
              <Image
                src={SITE_LOGO_SRC}
                alt=""
                width={120}
                height={120}
                className={`object-contain motion-safe:transition-[width,height] motion-safe:duration-200 max-sm:h-9 max-sm:w-9 ${
                  headerCompact ? "h-9 w-9 sm:h-12 sm:w-12" : "h-10 w-10 sm:h-14 sm:w-14"
                }`}
                priority
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-wide text-[#f2ece6]">WasGehtTüb</p>
                <p
                  className={`hidden truncate text-[11px] text-[#a89b90] sm:block motion-safe:transition-opacity motion-safe:duration-200 ${
                    headerCompact ? "sm:opacity-0 sm:pointer-events-none sm:h-0 sm:overflow-hidden" : ""
                  }`}
                >
                  Clubs, Tagesevents, Community
                </p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {!installDismissed && !isStandaloneDisplay ? (
              <button
                type="button"
                onClick={() => void handleInstallApp()}
                onContextMenu={(event) => {
                  event.preventDefault();
                  dismissInstallHint();
                }}
                className="relative inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1 rounded-full border border-[#2B2623] bg-[#1A1715]/90 px-2.5 text-xs font-semibold text-[#E9DFD6] transition-colors hover:bg-[#221d1a] sm:min-h-[44px] sm:min-w-[44px] sm:gap-1.5 sm:px-3"
                aria-label="App installieren"
                title="App installieren (Rechtsklick/Langdruck zum Ausblenden)"
              >
                <Download className="h-4 w-4 text-[#ff9a3f]" aria-hidden="true" />
                <span className="hidden sm:inline">App</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() =>
                showToast({
                  variant: "info",
                  title: "Benachrichtigungen",
                  message: "Push-Updates sind noch in Arbeit — nutze „Ich bin dabei!“, damit du Events schnell wiederfindest.",
                })
              }
              className="relative flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-[#2B2623] bg-[#1A1715]/90 transition-colors hover:bg-[#221d1a] sm:min-h-[44px] sm:min-w-[44px]"
              aria-label="Infos zu Benachrichtigungen"
            >
              <Bell className="w-5 h-5 text-[#A69A91]" aria-hidden="true" />
            </button>
            <Link
              href={isAuthenticated ? "/profile" : "/auth"}
              className="relative flex min-h-[40px] min-w-[40px] items-center justify-center sm:min-h-[44px] sm:min-w-[44px]"
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

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#2A2521] bg-[#141210]/90 px-3 py-2.5 transition-all duration-200 focus-within:bg-[#1b1714] focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-0 focus-within:ring-offset-[#0f0b08] sm:gap-3 sm:px-4 sm:py-3">
            <Search className="h-4 w-4 flex-shrink-0 text-[#8C8178]" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Events oder Locations suchen…"
              aria-label="Events suchen"
              id="discover-v2-search"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#E9DFD6] placeholder:text-[#6F655D] focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="shrink-0 text-xs text-[#8C8178] hover:text-[#E9DFD6]"
              >
                Leeren
              </button>
            ) : null}
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            {/* Mobile: cards + list + overflow for Kalender/Karte (saves horizontal chrome). */}
            <div
              className="flex items-center rounded-xl border border-[#2B2623] bg-[#1A1715]/90 p-0.5 sm:hidden"
              role="group"
              aria-label="Ansicht"
            >
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-all duration-200 ${
                  viewMode === "cards" ? viewModeToggleActive : viewModeToggleInactive
                }`}
                aria-label="Kartenansicht"
                aria-pressed={viewMode === "cards"}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-all duration-200 ${
                  viewMode === "list" ? viewModeToggleActive : viewModeToggleInactive
                }`}
                aria-label="Listenansicht"
                aria-pressed={viewMode === "list"}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewExtrasOpen(true)}
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-all duration-200 ${
                  viewMode === "calendar" || viewMode === "map" ? viewModeToggleActive : viewModeToggleInactive
                }`}
                aria-label="Weitere Ansichten: Kalender und Karte"
                aria-expanded={viewExtrasOpen}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <div
              className="hidden items-center rounded-xl border border-[#2B2623] bg-[#1A1715]/90 p-1 sm:flex"
              role="group"
              aria-label="Ansicht"
            >
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-all duration-200 ${
                  viewMode === "cards" ? viewModeToggleActive : viewModeToggleInactive
                }`}
                aria-label="Kartenansicht"
                aria-pressed={viewMode === "cards"}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-all duration-200 ${
                  viewMode === "list" ? viewModeToggleActive : viewModeToggleInactive
                }`}
                aria-label="Listenansicht"
                aria-pressed={viewMode === "list"}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-all duration-200 ${
                  viewMode === "calendar" ? viewModeToggleActive : viewModeToggleInactive
                }`}
                aria-label="Kalender"
                aria-pressed={viewMode === "calendar"}
              >
                <CalendarDays className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-all duration-200 ${
                  viewMode === "map" ? viewModeToggleActive : viewModeToggleInactive
                }`}
                aria-label="Karte"
                aria-pressed={viewMode === "map"}
              >
                <MapPin className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          className={`scrollbar-hide flex snap-x snap-proximity scroll-smooth items-center gap-2 overflow-x-auto overscroll-x-contain scroll-pb-1 pb-2 pt-1 motion-safe:transition-[margin] motion-safe:duration-200 ${
            headerCompact ? "mt-2 sm:mt-2" : "mt-2.5 sm:mt-4"
          }`}
          role="tablist"
          aria-label="Kategorien"
        >
          {filterItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setFilter(item.id);
                setVisibleCount(LOAD_MORE_STEP);
              }}
              role="tab"
              aria-selected={filter === item.id}
              className={`snap-start flex min-h-[40px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors duration-150 max-sm:py-1.5 sm:min-h-[32px] sm:gap-1 sm:px-2.5 sm:py-1 sm:text-sm lg:h-6 lg:min-h-0 lg:gap-1 lg:px-2 lg:py-0 ${
                filter === item.id
                  ? "bg-[#e86c14] text-[#2D1D10] border border-[#d9854c] shadow-[0_2px_8px_rgba(232,108,20,0.22)] sm:shadow-[0_2px_8px_rgba(232,108,20,0.22)]"
                  : "bg-[#1A1715]/90 border border-[#2B2623] text-[#A69A91] hover:text-[#E9DFD6] hover:border-[#3A312B]"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`rounded-full px-1 py-0.5 text-[10px] leading-none tabular-nums sm:text-[11px] ${
                  filter === item.id ? "bg-[#2D1D10]/20 text-[#2D1D10]" : "bg-[#24201D] text-[#8C8178]"
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
            className={`snap-start flex min-h-[40px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors duration-150 max-sm:py-1.5 sm:min-h-[32px] sm:gap-1 sm:px-2.5 sm:py-1 sm:text-sm lg:h-6 lg:min-h-0 lg:gap-1 lg:px-2 lg:py-0 ${
              likedOnly
                ? "bg-[#e86c14] text-[#2D1D10] border border-[#d9854c] shadow-[0_2px_8px_rgba(232,108,20,0.22)] sm:shadow-[0_2px_8px_rgba(232,108,20,0.22)]"
                : "bg-[#1A1715]/90 border border-[#2B2623] text-[#A69A91] hover:text-[#E9DFD6] hover:border-[#3A312B]"
            }`}
          >
            <Heart className={`h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5 ${likedOnly ? "fill-current" : ""}`} aria-hidden="true" />
            <span>Gespeichert</span>
            <span
              className={`rounded-full px-1 py-0.5 text-[10px] leading-none tabular-nums sm:text-[11px] ${likedOnly ? "bg-[#2D1D10]/20 text-[#2D1D10]" : "bg-[#24201D] text-[#8C8178]"}`}
            >
              {savedCount}
            </span>
          </button>
        </div>

        {viewMode === "cards" && hottestParty && topScore > 0 ? (
        <div className={`mt-2 motion-safe:transition-opacity motion-safe:duration-200 ${headerCompact ? "max-sm:opacity-0 max-sm:h-0 max-sm:mt-0 max-sm:overflow-hidden max-sm:pointer-events-none" : ""}`}>
            <Link
              href={hottestParty.detailHref}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-[#ff9a3f] bg-[#ff7a18] px-3 py-1.5 text-xs font-semibold text-[#2D1D10] shadow-[0_8px_24px_rgba(255,122,24,0.42)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9a3f]/50 sm:min-h-[38px] sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
              aria-label={`Im Trend: ${hottestParty.title}`}
            >
              <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
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
              ? "px-0 pt-3 max-sm:pt-5"
              : "px-2.5 pt-2 max-sm:pt-4"
        }
        role={viewMode === "map" || viewMode === "calendar" ? undefined : "feed"}
        aria-label={
          viewMode === "map" ? "Karte" : viewMode === "calendar" ? "Kalender" : "Event-Feed"
        }
      >
        {viewMode === "calendar" ? (
          <DiscoverCalendarPanelLazy
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
            <div className="grid min-w-0 grid-cols-1 gap-4 max-sm:px-3 md:grid-cols-2 md:gap-4 md:px-0 md:max-w-[min(100%,80rem)] md:mx-auto">
              {discoverGroupedWithCardPriority.map((section) => (
                <Fragment key={section.sectionKey}>
                  <div className="col-span-full px-0 pt-1 md:col-span-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8C8178] sm:text-sm sm:normal-case sm:tracking-normal sm:text-[#c9bfb6]">
                      {section.label}
                    </h2>
                  </div>
                  {section.events.map(({ event, imagePriority }) => (
                    <DiscoverFeedScrollItem key={event.id} variant="card" scrollSnap>
                      <DiscoverEventCardV2
                        event={{ ...event, heroImageUrl: clientHeroUrls[event.id] ?? event.heroImageUrl }}
                        imagePriority={imagePriority}
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
                </Fragment>
              ))}
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2 md:gap-3 md:max-w-[min(100%,80rem)] md:mx-auto">
              {discoverGroupedSections.map((section) => (
                <Fragment key={section.sectionKey}>
                  <div className="col-span-full px-1 pt-1 md:col-span-2 md:px-0">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8C8178] sm:text-sm sm:normal-case sm:tracking-normal sm:text-[#c9bfb6]">
                      {section.label}
                    </h2>
                  </div>
                  {section.events.map((event) => (
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
                </Fragment>
              ))}
            </div>
          )
        ) : likedOnly && filteredByType.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 px-4 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4 border border-border">
              <Heart className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground mb-2">Noch nichts gemerkt</h2>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              Tippe bei einem Event auf „Ich bin dabei!“, um es hier zu speichern — oder stöbere neu in allen Events.
            </p>
            <button
              type="button"
              onClick={() => navigateBottomNavDiscover()}
              className="mt-6 min-h-[44px] px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full editorial-shadow hover:opacity-90 transition-opacity"
            >
              Events entdecken
            </button>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-20 px-4 text-center"
            role="status"
            aria-live="polite"
          >
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
              className="mt-6 min-h-[44px] px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full editorial-shadow hover:opacity-90 transition-opacity"
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
              className="min-h-[44px] px-5 py-2.5 rounded-full border border-border bg-card/50 text-sm font-medium text-foreground hover:bg-card"
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
              className="inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full editorial-shadow hover:opacity-90 transition-opacity text-sm disabled:opacity-70"
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

      {showScrollTop ? (
        <button
          type="button"
          className="fixed bottom-[7.25rem] left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-[#2B2623] bg-[#1A1715]/95 text-[#E9DFD6] shadow-lg backdrop-blur-md transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:hidden"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Nach oben scrollen"
        >
          <ChevronUp className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}

      <button
        type="button"
        className="fixed bottom-[7.25rem] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-[#2B2623] bg-[#1A1715]/95 text-[#E9DFD6] shadow-lg backdrop-blur-md transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:hidden"
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

      {viewExtrasOpen ? (
        <div
          className="fixed inset-0 z-[60] sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discover-view-extras-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            aria-label="Schließen"
            onClick={() => setViewExtrasOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-[#2B2623] bg-[#141210] p-4 shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#3a312b]" aria-hidden="true" />
            <h2 id="discover-view-extras-title" className="text-base font-semibold text-[#f2ece6]">
              Weitere Ansichten
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#a89b90]">
              Kalender oder Karte für Übersicht — ohne die Schnellwahl oben zu überladen.
            </p>
            <button
              type="button"
              onClick={() => {
                setViewMode("calendar");
                setViewExtrasOpen(false);
              }}
              className={`mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${
                viewMode === "calendar"
                  ? "bg-[#ff7a18] text-[#2D1D10] shadow-[0_8px_24px_rgba(255,122,24,0.35)]"
                  : "border border-[#2B2623] bg-[#1A1715]/90 text-[#E9DFD6] hover:border-primary/40"
              }`}
            >
              <CalendarDays className="h-5 w-5 shrink-0" aria-hidden="true" />
              Kalender
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("map");
                setViewExtrasOpen(false);
              }}
              className={`mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${
                viewMode === "map"
                  ? "bg-[#ff7a18] text-[#2D1D10] shadow-[0_8px_24px_rgba(255,122,24,0.35)]"
                  : "border border-[#2B2623] bg-[#1A1715]/90 text-[#E9DFD6] hover:border-primary/40"
              }`}
            >
              <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
              Karte
            </button>
            <button
              type="button"
              className="mt-3 w-full min-h-[44px] rounded-xl border border-[#2B2623] bg-transparent py-3 text-sm font-medium text-[#a89b90]"
              onClick={() => setViewExtrasOpen(false)}
            >
              Schließen
            </button>
          </div>
        </div>
      ) : null}

      <DiscoverBottomNavV2
        activeTab={likedOnly ? "saved" : "discover"}
        onSelectDiscover={navigateBottomNavDiscover}
        onSelectSaved={navigateBottomNavSaved}
      />
    </div>
  );
}
