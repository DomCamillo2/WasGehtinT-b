"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

type FilterKey = "all" | "community" | "clubs" | "daytime";
type ViewKey = "calendar" | "list" | "map";

const LOCAL_UPVOTED_EVENTS_KEY = "wasgeht-upvoted-events-v1";
const LOAD_MORE_STEP = 12;

const BERLIN_DAY_KEY_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Berlin",
});

const BERLIN_CALENDAR_HEADING_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "long",
  day: "2-digit",
  month: "long",
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

export function DiscoverPremium({
  parties,
  avatarFallback,
  isAuthenticated,
  canLoadMore,
  loadMoreHref,
}: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [view, setView] = useState<ViewKey>("calendar");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [authSheetReason, setAuthSheetReason] = useState("Um mitzumachen, logge dich mit deiner Uni-Mail ein.");
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
  }, [filter, onlyMappable, parties]);

  const todayKey = useMemo(
    () => BERLIN_DAY_KEY_FORMATTER.format(new Date()),
    [],
  );

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
      if (filter === "clubs" && !isClubEvent(party)) return false;
      if (filter === "daytime" && party.event_scope !== "daytime") return false;
      if (filter === "community" && !party.is_community && party.source_badge !== "Community") return false;
      if (onlyMappable && !hasMapCoordinates(party)) return false;

      return true;
    });
  }, [filter, onlyMappable, sortedParties]);

  const mapParties = useMemo(
    () => filteredParties.filter((party) => hasMapCoordinates(party)),
    [filteredParties],
  );

  const visibleParties = useMemo(() => {
    return filteredParties.slice(0, visibleCount);
  }, [filteredParties, visibleCount]);

  const hasMoreVisibleParties = filteredParties.length > visibleCount;

  const filterItems: Array<{ key: FilterKey; label: string; icon?: typeof Flame }> = [
    { key: "all", label: "Alle", icon: Compass },
    { key: "clubs", label: "Clubs", icon: Building2 },
    { key: "daytime", label: "Tagesevents", icon: CalendarDays },
    { key: "community", label: "Community", icon: UsersRound },
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

  const viewItems = [
    { key: "calendar" as const, label: "Kalender", icon: CalendarDays },
    { key: "list" as const, label: "Liste", icon: List },
    { key: "map" as const, label: "Karte", icon: MapIcon },
  ];

  function resetToAllView() {
    setFilter("all");
    setOnlyMappable(false);
    setView("calendar");
  }

  function handleFilterSelection(nextFilter: FilterKey) {
    if (nextFilter === "all") {
      resetToAllView();
      return;
    }

    setFilter(nextFilter);
  }

  const calendarSections = useMemo(() => {
    const grouped = new Map<string, PartyCardType[]>();

    for (const party of filteredParties) {
      const dateKey = toDateKeyBerlin(party.starts_at);
      const existing = grouped.get(dateKey);
      if (existing) {
        existing.push(party);
      } else {
        grouped.set(dateKey, [party]);
      }
    }

    return Array.from(grouped.entries()).map(([dateKey, items]) => ({
      dateKey,
      label: BERLIN_CALENDAR_HEADING_FORMATTER.format(new Date(`${dateKey}T12:00:00Z`)),
      items,
    }));
  }, [filteredParties]);

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
              <h1 className="mt-1.5 max-w-[16ch] text-[2rem] font-black leading-[0.98] tracking-tight text-[color:var(--foreground)] lg:max-w-[18ch] lg:text-[3.2rem]">
                {"Was geht in T\u00fcbingen heute?"}
              </h1>
              <div
                className="mt-3 inline-flex items-center gap-1 rounded-[18px] border p-1"
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
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition sm:text-sm ${
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
                      <Icon size={14} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
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
          {calendarSections.length ? (
            calendarSections.map((section) => (
              <section key={section.dateKey} className="space-y-2">
                <div
                  className="sticky top-[5.25rem] z-10 rounded-full px-3 py-1.5 text-xs font-semibold capitalize backdrop-blur"
                  style={{
                    color: "var(--foreground)",
                    backgroundColor: "color-mix(in srgb, var(--surface-elevated) 84%, transparent)",
                    border: "1px solid var(--border-soft)",
                  }}
                >
                  {section.label}
                </div>
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {section.items.map((party) => (
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
              </section>
            ))
          ) : (
            <div className="surface-card rounded-[24px] p-4 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Für den aktiven Filter sind aktuell keine Events verfügbar.
            </div>
          )}
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

