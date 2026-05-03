"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Flame,
  Heart,
  MapPin,
  Sparkles,
} from "lucide-react";
import { DiscoverEvent } from "@/services/discover/discover-view-model";

type Props = {
  party: DiscoverEvent;
  expanded: boolean;
  onToggle: () => void;
  isAuthenticated: boolean;
  upvoted?: boolean;
  upvoteCount?: number;
  rankLabel?: string | null;
  isHotNow?: boolean;
  onToggleUpvote?: () => void;
};

type TypeTagKey = "club-bar" | "wg-privat" | "treffen" | "daytime" | "extern";

type TypeTag = {
  key: TypeTagKey;
  label: string;
  bookmarkClasses: string;
};

const PARTNER_LOGOS: Array<{ match: RegExp; src: string; alt: string }> = [
  { match: /kuckuck/i, src: "/logos/venues/kuckuck.png", alt: "Kuckuck Logo" },
  { match: /schlachthaus/i, src: "/logos/venues/schlachthaus.jpg", alt: "Schlachthaus Logo" },
  { match: /clubhaus/i, src: "/logos/venues/clubhaus.jpg", alt: "Clubhaus Logo" },
  { match: /epplehaus/i, src: "/logos/venues/epplehaus.jpg", alt: "Epplehaus Logo" },
  {
    match: /frau\s*holle|frauholle|frau_holle_tuebingen|holle\s*t(?:ue|u)bingen|haaggasse\s*15\/?2/i,
    src: "/logos/venues/frau-holle.svg",
    alt: "Frau Holle Icon",
  },
  {
    match: /schwarzes\s*schaf|schwarzes[-_.\s]*schaf|schwarzesschaf\.tuebingen|schwarzes_schaf_tuebingen|schwarzesschaf_tuebingen/i,
    src: "/logos/venues/schwarzes-schaf.svg",
    alt: "Schwarzes Schaf Icon",
  },
];

function resolveVenueLabel(party: DiscoverEvent): string {
  const locationName = (party.locationName ?? "").trim();
  if (locationName.length > 0) {
    const shortLocation = locationName.split(",")[0]?.trim();
    if (shortLocation) {
      return shortLocation;
    }
  }

  const vibeLabel = (party.vibeLabel ?? "").trim();
  if (vibeLabel.length > 0 && vibeLabel.toLowerCase() !== "instagram") {
    return vibeLabel;
  }

  return "Tuebingen";
}

function getTypeTag(party: DiscoverEvent): TypeTag {
  const title = party.title.toLowerCase();
  const description = (party.description ?? "").toLowerCase();
  const vibe = party.vibeLabel.toLowerCase();
  const location = (party.locationName ?? "").toLowerCase();
  const text = `${title} ${description} ${vibe}`;

  if (party.eventScope === "daytime") {
    return {
      key: "daytime",
      label: party.categoryLabel?.trim() || "Tagesevent",
      bookmarkClasses: "bg-sky-100/95 text-sky-800 ring-sky-300",
    };
  }

  if (text.includes("treffen") || text.includes("meetup") || text.includes("stammtisch")) {
    return {
      key: "treffen",
      label: "Treffen",
      bookmarkClasses: "bg-emerald-50/95 text-emerald-700 ring-emerald-200",
    };
  }

  if (!party.isExternal) {
    return {
      key: "wg-privat",
      label: "WG/Privat",
      bookmarkClasses: "bg-fuchsia-100/95 text-fuchsia-800 ring-fuchsia-300",
    };
  }

  if (
    vibe.includes("kuckuck") || location.includes("kuckuck") ||
    vibe.includes("schlachthaus") || location.includes("schlachthaus") ||
    vibe.includes("clubhaus") || location.includes("clubhaus") ||
    vibe.includes("sudhaus") || location.includes("sudhaus") ||
    vibe.includes("top10") ||
    vibe.includes("blauer turm") ||
    location.includes("holle") ||
    location.includes("zahni") ||
    location.includes("schwarzes schaf") ||
    location.includes("schaf")
  ) {
    return {
      key: "club-bar",
      label: "Club/Bar",
      bookmarkClasses: "bg-amber-100/95 text-amber-800 ring-amber-300",
    };
  }

  return {
    key: "extern",
    label: "Extern",
    bookmarkClasses: "bg-zinc-100/95 text-zinc-700 ring-zinc-200",
  };
}

function getAddressLine(party: DiscoverEvent) {
  const vibe = party.vibeLabel.toLowerCase();

  if (vibe.includes("schlachthaus")) {
    return "Schlachthausstra\u00dfe 9, T\u00fcbingen";
  }
  if (vibe.includes("kuckuck")) {
    return "Kuckuck, T\u00fcbingen";
  }
  if (vibe.includes("clubhaus")) {
    return "Wilhelmstra\u00dfe 30, 72074 T\u00fcbingen";
  }
  if (party.publicLat && party.publicLng) {
    return `Koordinaten: ${party.publicLat.toFixed(4)}, ${party.publicLng.toFixed(4)}`;
  }
  if (party.locationName && party.locationName.trim().length > 0) {
    return party.locationName;
  }
  return "Adresse wird vor dem Event bekannt gegeben";
}

function resolvePartnerLogo(party: DiscoverEvent, typeTag: TypeTag): { src: string; alt: string } | null {
  const locationName = (party.locationName ?? "").trim();
  const probeText = `${locationName} ${party.vibeLabel} ${party.title} ${party.externalLink ?? ""}`;

  for (const partner of PARTNER_LOGOS) {
    if (partner.match.test(probeText)) {
      return { src: partner.src, alt: partner.alt };
    }
  }

  if (typeTag.key === "club-bar") {
    return { src: "/logos/venues/dance.png", alt: "Dance Icon" };
  }

  return null;
}

const MUSIC_GENRE_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /hard\s*trance|trance|bounce/i, label: "Trance/Bounce" },
  { regex: /techno|acid\s*techno/i, label: "Techno" },
  { regex: /house|deep\s*house|afro\s*house/i, label: "House" },
  { regex: /drum\s*&?\s*bass|dnb/i, label: "Drum & Bass" },
  { regex: /hip\s*hop|rap|trap/i, label: "Hip-Hop" },
  { regex: /reggaeton|latin/i, label: "Reggaeton" },
  { regex: /rnb|r\s*&\s*b/i, label: "R&B" },
  { regex: /electro|edm/i, label: "Electro" },
  { regex: /disco|funk/i, label: "Disco/Funk" },
  { regex: /rock|indie|metal|punk/i, label: "Rock/Indie" },
  { regex: /karaoke/i, label: "Karaoke" },
  { regex: /90s|2000s|80s/i, label: "Classics" },
  { regex: /mixed\s*music|all\s*styles|querbeet/i, label: "Mixed" },
];

const BERLIN_SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

const BERLIN_TIME_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
});

const BERLIN_FULL_DATETIME_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  dateStyle: "full",
  timeStyle: "short",
});

function resolveMusicGenre(party: DiscoverEvent): string | null {
  if (party.musicGenre && party.musicGenre.trim().length > 0) {
    return party.musicGenre.trim();
  }

  const text = `${party.title} ${party.description ?? ""} ${party.vibeLabel}`;
  for (const pattern of MUSIC_GENRE_PATTERNS) {
    if (pattern.regex.test(text)) {
      return pattern.label;
    }
  }

  return party.isExternal ? "Nicht angegeben" : null;
}

export function EventCard({
  party,
  expanded,
  onToggle,
  isAuthenticated,
  upvoted = false,
  upvoteCount,
  rankLabel,
  isHotNow = false,
  onToggleUpvote,
}: Props) {
  const typeTag = getTypeTag(party);
  const musicGenre = resolveMusicGenre(party);
  const partnerLogo = resolvePartnerLogo(party, typeTag);
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const [showFlameTooltip, setShowFlameTooltip] = useState(false);

  const hostAvatarSrc = party.hostAvatarUrl ?? null;
  const partnerLogoSrc = partnerLogo?.src ?? null;
  const avatarSrc =
    partnerLogoSrc && failedImageSrc !== partnerLogoSrc
      ? partnerLogoSrc
      : hostAvatarSrc && failedImageSrc !== hostAvatarSrc
        ? hostAvatarSrc
        : null;
  const isLocalAvatar = Boolean(avatarSrc?.startsWith("/"));
  const locationLine = resolveVenueLabel(party);
  const normalizedSourceBadge = (party.sourceBadge ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
  const shouldShowSourceBadge =
    Boolean(party.sourceBadge) &&
    normalizedSourceBadge !== "official scraper" &&
    !normalizedSourceBadge.includes("instagram");
  const fallbackInitial = (party.vibeLabel[0] || party.title[0] || "E").toUpperCase();
  const effectiveUpvoteCount = Math.max(0, upvoteCount ?? party.upvoteCount ?? 0);
  const canUpvote = true;
  const startsAtDate = new Date(party.startsAt);
  const formattedDate = BERLIN_SHORT_DATE_FORMATTER.format(startsAtDate);
  const formattedTime = BERLIN_TIME_FORMATTER.format(startsAtDate);
  const timingLabel = party.isAllDay ? "Ganztagig" : `${formattedTime} Uhr`;
  const cardBorderColor = isHotNow
    ? "#fb923c"
    : party.isExternal
      ? "color-mix(in srgb, var(--border-strong) 72%, rgba(148, 163, 184, 0.18))"
      : "color-mix(in srgb, var(--accent) 14%, var(--border-soft) 86%)";
  const cardShadow = isHotNow ? undefined : "0 14px 34px -24px rgba(15, 23, 42, 0.48)";

  return (
    <article
      id={`event-${party.id}`}
      onClick={onToggle}
      className={`relative h-full w-full min-w-0 rounded-[26px] border p-3.5 lg:[contain-intrinsic-size:360px] lg:[content-visibility:auto] transition-all hover:-translate-y-[1px] hover:shadow-[0_18px_36px_-24px_rgba(15,23,42,0.5)] ${
        isHotNow ? "hot-card-glow" : ""
      }`}
      style={{
        borderColor: cardBorderColor,
        backgroundColor: "var(--surface-elevated)",
        boxShadow: cardShadow,
      }}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 inline-flex items-center gap-2">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-2xl border"
              style={{
                borderColor: isHotNow
                  ? "color-mix(in srgb, #fdba74 42%, var(--nav-border) 58%)"
                  : "color-mix(in srgb, var(--border-soft) 80%, transparent)",
                background: isHotNow
                  ? "linear-gradient(135deg, color-mix(in srgb, #fb923c 14%, var(--surface-soft)), color-mix(in srgb, #fdba74 10%, var(--surface-elevated)))"
                  : "linear-gradient(135deg, color-mix(in srgb, var(--surface-soft) 88%, white 12%), var(--surface-elevated))",
              }}
            >
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt=""
                  aria-hidden="true"
                  width={36}
                  height={36}
                  sizes="36px"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  unoptimized={!isLocalAvatar}
                  onError={() => setFailedImageSrc(avatarSrc)}
                />
              ) : (
                <div
                  className="grid h-full w-full place-items-center text-[10px] font-bold"
                  style={{ color: isHotNow ? "#fdba74" : "var(--muted-foreground)" }}
                >
                  {fallbackInitial}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <span className="truncate text-sm font-bold text-[color:var(--muted-foreground)]">
                {locationLine}
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5">
            {shouldShowSourceBadge ? (
              <span
                className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  backgroundColor: "color-mix(in srgb, #10b981 18%, var(--surface-soft))",
                  color: "color-mix(in srgb, #6ee7b7 72%, var(--foreground))",
                }}
              >
                {party.sourceBadge}
              </span>
            ) : null}

            <span
              className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.08em]"
              style={{
                backgroundColor: isHotNow
                  ? "color-mix(in srgb, #fb923c 12%, var(--surface-soft))"
                  : "color-mix(in srgb, var(--surface-soft) 86%, transparent)",
                color: isHotNow ? "#fdba74" : "var(--muted-foreground)",
              }}
            >
              {typeTag.label}
            </span>

            <div className="relative">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!canUpvote) {
                    return;
                  }
                  onToggleUpvote?.();
                }}
                onMouseEnter={() => setShowFlameTooltip(true)}
                onMouseLeave={() => setShowFlameTooltip(false)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border px-3 transition-colors"
                style={{
                  borderColor: upvoted
                    ? "color-mix(in srgb, #fb7185 56%, white 12%)"
                    : isHotNow
                      ? "color-mix(in srgb, #fdba74 44%, var(--nav-border) 56%)"
                      : "color-mix(in srgb, var(--border-soft) 78%, transparent)",
                  background: upvoted
                    ? "linear-gradient(135deg, rgba(255,241,242,0.98), rgba(255,228,230,0.92))"
                    : isHotNow
                      ? "linear-gradient(135deg, rgba(255,247,237,0.98), rgba(255,237,213,0.92))"
                      : "linear-gradient(135deg, color-mix(in srgb, var(--surface-soft) 92%, white 8%), var(--surface-elevated))",
                  color: upvoted ? "#e11d48" : isHotNow ? "#ea580c" : "var(--muted-foreground)",
                  opacity: canUpvote ? 1 : 0.55,
                  minWidth: "3rem",
                  boxShadow: isHotNow ? "0 14px 28px -20px rgba(249, 115, 22, 0.6)" : "none",
                }}
                aria-label={
                  canUpvote ? (upvoted ? "Teilnahme entfernen" : "Teilnahme geben") : "Teilnahme nur für WG-Partys"
                }
                disabled={!canUpvote}
              >
                <span className="inline-flex">
                  <Flame size={15} fill={upvoted || isHotNow ? "currentColor" : "none"} />
                </span>
                <span className="text-[11px] font-bold leading-none">{effectiveUpvoteCount}</span>
              </button>

              {showFlameTooltip ? (
                <div className="pointer-events-none absolute -top-14 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg">
                  <span>Teilnahmen zeigen Hype</span>
                  <div className="absolute left-1/2 top-full h-1.5 w-1.5 -translate-x-1/2 -translate-y-0.5 rotate-45 bg-gray-900" />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold leading-tight tracking-tight" style={{ color: "var(--foreground)" }}>
            {party.title}
          </h2>

          {rankLabel && !isHotNow ? (
            <div
              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{
                borderColor: "var(--nav-border)",
                backgroundColor: "var(--surface-soft)",
                color: "var(--muted-foreground)",
              }}
            >
              <Heart size={11} />
              <span>{rankLabel}</span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium text-[color:var(--muted-foreground)] sm:text-[12px]">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-1"
              style={{
                backgroundColor: "color-mix(in srgb, var(--surface-soft) 70%, transparent)",
                color: "var(--muted-foreground)",
              }}
            >
              <CalendarDays size={12} strokeWidth={2.2} />
              {formattedDate}
            </span>

            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-1"
              style={{
                backgroundColor: "color-mix(in srgb, var(--surface-soft) 70%, transparent)",
                color: "var(--muted-foreground)",
              }}
            >
              <Clock3 size={12} strokeWidth={2.2} />
              {timingLabel}
            </span>

            <span
              className="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-1"
              style={{
                backgroundColor: "color-mix(in srgb, var(--surface-soft) 58%, transparent)",
                color: "var(--muted-foreground)",
              }}
            >
              <MapPin size={12} strokeWidth={2.2} />
              <span className="max-w-[22ch] truncate">{locationLine}</span>
            </span>

            {isHotNow ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold"
                style={{
                  backgroundColor: "rgba(251, 146, 60, 0.12)",
                  color: "#fdba74",
                }}
              >
                <Sparkles size={12} strokeWidth={2.2} />
                Meiste Teilnahmen
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Link
          href={party.detailHref}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
          style={{
            borderColor: "var(--nav-border)",
            backgroundColor: "var(--surface-soft)",
            color: "var(--foreground)",
          }}
        >
          Details ansehen
        </Link>

        {party.externalLink ? (
          <a
            href={party.externalLink}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              color: "var(--accent-strong)",
            }}
          >
            Quelle
            <ArrowUpRight size={13} />
          </a>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-2 overflow-hidden">
          <div
            className="rounded-2xl p-3 text-sm"
            style={{ backgroundColor: "var(--surface-soft)", color: "var(--muted-foreground)" }}
          >
            <p>
              <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                Typ:
              </span>{" "}
              {typeTag.label}
            </p>
            {musicGenre ? (
              <p className="mt-1">
                <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                  Musik:
                </span>{" "}
                {musicGenre}
              </p>
            ) : null}
            {party.categoryLabel ? (
              <p className="mt-1">
                <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                  Kategorie:
                </span>{" "}
                {party.categoryLabel}
              </p>
            ) : null}
            {party.audienceLabel ? (
              <p className="mt-1">
                <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                  Zielgruppe:
                </span>{" "}
                {party.audienceLabel}
              </p>
            ) : null}
            {party.priceInfo ? (
              <p className="mt-1">
                <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                  Preis:
                </span>{" "}
                {party.priceInfo}
              </p>
            ) : null}
            <p className="mt-1">
              <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                Adresse:
              </span>{" "}
              {getAddressLine(party)}
            </p>
            <p className="mt-1">
              <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                Start:
              </span>{" "}
              {BERLIN_FULL_DATETIME_FORMATTER.format(new Date(party.startsAt))}
            </p>
            <p className="mt-1">
              <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                Ende:
              </span>{" "}
              {BERLIN_FULL_DATETIME_FORMATTER.format(new Date(party.endsAt))}
            </p>
            {party.description ? (
              <p className="mt-2" style={{ color: "var(--muted-foreground)" }}>
                <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                  Was passiert:
                </span>{" "}
                {party.description}
              </p>
            ) : null}
            {party.isExternal && party.externalLink ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={party.detailHref}
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                  style={{
                    borderColor: "var(--nav-border)",
                    backgroundColor: "var(--surface-elevated)",
                    color: "var(--foreground)",
                  }}
                >
                  Detailseite
                </Link>
              </div>
            ) : null}
            {!party.isExternal && party.hostUserId ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {isAuthenticated ? (
                  <Link
                    href={`/profile/${party.hostUserId}`}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                    style={{
                      borderColor: "var(--nav-border)",
                      backgroundColor: "var(--surface-elevated)",
                      color: "var(--foreground)",
                    }}
                  >
                    Host-Profil
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
