"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  MapPin,
} from "lucide-react";
import { PartyCard } from "@/lib/types";

type Props = {
  party: PartyCard;
  expanded: boolean;
  onToggle: () => void;
};

type TypeTagKey = "club-bar" | "wg-privat" | "treffen" | "extern";

type TypeTag = {
  key: TypeTagKey;
  label: string;
  bookmarkClasses: string;
};

const PARTNER_LOGOS: Array<{ match: RegExp; src: string; alt: string }> = [
  { match: /kuckuck/i, src: "/logos/venues/kuckuck.png", alt: "Kuckuck Logo" },
  { match: /schlachthaus/i, src: "/logos/venues/schlachthaus.jpg", alt: "Schlachthaus Logo" },
  { match: /clubhaus/i, src: "/logos/venues/clubhaus.jpg", alt: "Clubhaus Logo" },
];

function getTypeTag(party: PartyCard): TypeTag {
  const title = party.title.toLowerCase();
  const description = (party.description ?? "").toLowerCase();
  const vibe = party.vibe_label.toLowerCase();
  const text = `${title} ${description} ${vibe}`;

  if (text.includes("treffen") || text.includes("meetup") || text.includes("stammtisch")) {
    return {
      key: "treffen",
      label: "Treffen",
      bookmarkClasses: "bg-emerald-50/95 text-emerald-700 ring-emerald-200",
    };
  }

  if (!party.is_external) {
    return {
      key: "wg-privat",
      label: "WG/Privat",
      bookmarkClasses: "bg-fuchsia-100/95 text-fuchsia-800 ring-fuchsia-300",
    };
  }

  if (
    vibe.includes("kuckuck") ||
    vibe.includes("schlachthaus") ||
    vibe.includes("clubhaus") ||
    vibe.includes("sudhaus") ||
    vibe.includes("top10") ||
    vibe.includes("blauer turm")
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

function getAddressLine(party: PartyCard) {
  const vibe = party.vibe_label.toLowerCase();

  if (vibe.includes("schlachthaus")) {
    return "Schlachthausstraße 9, Tübingen";
  }
  if (vibe.includes("kuckuck")) {
    return "Kuckuck, Tübingen";
  }
  if (vibe.includes("clubhaus")) {
    return "Wilhelmstraße 30, 72074 Tübingen";
  }
  if (party.public_lat && party.public_lng) {
    return `Koordinaten: ${party.public_lat.toFixed(4)}, ${party.public_lng.toFixed(4)}`;
  }
  return "Adresse wird vor dem Event bekannt gegeben";
}

function resolvePartnerLogo(party: PartyCard): { src: string; alt: string } | null {
  const locationName = (party.location_name ?? "").trim();
  const probeText = `${locationName} ${party.vibe_label} ${party.title}`;

  for (const partner of PARTNER_LOGOS) {
    if (partner.match.test(probeText)) {
      return { src: partner.src, alt: partner.alt };
    }
  }

  return null;
}

const MUSIC_GENRE_PATTERNS: Array<{ regex: RegExp; label: string }> = [
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

function resolveMusicGenre(party: PartyCard): string | null {
  if (party.music_genre && party.music_genre.trim().length > 0) {
    return party.music_genre.trim();
  }

  const text = `${party.title} ${party.description ?? ""} ${party.vibe_label}`;
  for (const pattern of MUSIC_GENRE_PATTERNS) {
    if (pattern.regex.test(text)) {
      return pattern.label;
    }
  }

  return party.is_external ? "Nicht angegeben" : null;
}

export function EventCard({ party, expanded, onToggle }: Props) {
  const typeTag = getTypeTag(party);
  const musicGenre = resolveMusicGenre(party);
  const partnerLogo = resolvePartnerLogo(party);
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);

  const hostAvatarSrc = party.host_avatar_url ?? null;
  const partnerLogoSrc = partnerLogo?.src ?? null;
  const avatarSrc =
    hostAvatarSrc && failedImageSrc !== hostAvatarSrc
      ? hostAvatarSrc
      : partnerLogoSrc && failedImageSrc !== partnerLogoSrc
        ? partnerLogoSrc
        : null;
  const locationLine = party.location_name || party.vibe_label;
  const fallbackInitial = (party.vibe_label[0] || party.title[0] || "E").toUpperCase();

  return (
    <motion.article
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985, y: -1 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      onClick={onToggle}
      className="relative rounded-3xl border p-4 shadow-sm transition-shadow hover:shadow-md"
      style={{
        borderColor: "var(--nav-border)",
        backgroundColor: "var(--surface-elevated)",
      }}
    >
      <div className="absolute right-3 top-3 z-10">
        <span
          className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-gray-500"
        >
          {typeTag.label}
        </span>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-start gap-3">
          <div
            className="h-11 w-11 shrink-0 self-start overflow-hidden rounded-full border shadow-sm"
            style={{
              borderColor: "var(--nav-border)",
              backgroundColor: "var(--surface-soft)",
            }}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Club oder Host"
                className="h-full w-full object-cover"
                onError={() => setFailedImageSrc(avatarSrc)}
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>
                {fallbackInitial}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-14">
            <h3 className="line-clamp-2 text-[1.85rem] font-black leading-tight tracking-tight" style={{ color: "var(--foreground)" }}>
              {party.title}
            </h3>

            <p className="mt-1.5 inline-flex max-w-full items-center gap-1.5 overflow-hidden text-[12px] font-medium text-gray-500">
              <span className="inline-flex shrink-0 items-center gap-1">
                <MapPin size={12} />
                <span className="max-w-[9.75rem] truncate">{locationLine}</span>
              </span>
              <span className="shrink-0">•</span>
              <span className="inline-flex shrink-0 items-center gap-1">
                <CalendarDays size={12} />
                {new Intl.DateTimeFormat("de-DE", {
                  timeZone: "Europe/Berlin",
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                }).format(new Date(party.starts_at))}
              </span>
              <span className="shrink-0">•</span>
              <span className="inline-flex shrink-0 items-center gap-1">
                <Clock3 size={12} />
                {new Intl.DateTimeFormat("de-DE", {
                  timeZone: "Europe/Berlin",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(party.starts_at))}
                Uhr
              </span>
            </p>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl p-3 text-sm" style={{ backgroundColor: "var(--surface-soft)", color: "var(--muted-foreground)" }}>
                <p>
                  <span className="font-semibold" style={{ color: "var(--foreground)" }}>Typ:</span> {typeTag.label}
                </p>
                {musicGenre ? (
                  <p className="mt-1">
                    <span className="font-semibold" style={{ color: "var(--foreground)" }}>Musik:</span> {musicGenre}
                  </p>
                ) : null}
                <p className="mt-1">
                  <span className="font-semibold" style={{ color: "var(--foreground)" }}>Adresse:</span> {getAddressLine(party)}
                </p>
                <p className="mt-1">
                  <span className="font-semibold" style={{ color: "var(--foreground)" }}>Start:</span>{" "}
                  {new Intl.DateTimeFormat("de-DE", {
                    timeZone: "Europe/Berlin",
                    dateStyle: "full",
                    timeStyle: "short",
                  }).format(new Date(party.starts_at))}
                </p>
                <p className="mt-1">
                  <span className="font-semibold" style={{ color: "var(--foreground)" }}>Ende:</span>{" "}
                  {new Intl.DateTimeFormat("de-DE", {
                    timeZone: "Europe/Berlin",
                    dateStyle: "full",
                    timeStyle: "short",
                  }).format(new Date(party.ends_at))}
                </p>
                {party.description ? (
                  <p className="mt-2" style={{ color: "var(--muted-foreground)" }}>
                    <span className="font-semibold" style={{ color: "var(--foreground)" }}>Was passiert:</span> {party.description}
                  </p>
                ) : null}
                {!party.is_external && party.host_user_id ? (
                  <div className="mt-2">
                    <Link
                      href={`/profile/${party.host_user_id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                      style={{
                        borderColor: "var(--nav-border)",
                        backgroundColor: "var(--surface-elevated)",
                        color: "var(--foreground)",
                      }}
                    >
                      Host-Profil ansehen
                    </Link>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
