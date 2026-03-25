"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  GlassWater,
  Home,
  MapPin,
  Users,
  Zap,
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

function getBadgeClasses(vibeLabel: string) {
  const normalized = vibeLabel.toLowerCase();

  if (normalized.includes("schlachthaus")) {
    return "text-amber-900 bg-amber-100";
  }
  if (normalized.includes("kuckuck")) {
    return "text-red-700 bg-red-50";
  }
  if (normalized.includes("clubhaus")) {
    return "text-blue-700 bg-blue-50";
  }

  return "text-indigo-600 bg-indigo-50";
}

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
      bookmarkClasses: "bg-teal-50/95 text-teal-700 ring-teal-200",
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
      bookmarkClasses: "bg-violet-50/95 text-violet-700 ring-violet-200",
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

function resolveFallbackIcon(party: PartyCard) {
  const text = `${party.vibe_label} ${party.title} ${party.description ?? ""}`.toLowerCase();

  if (!party.is_external) {
    return Home;
  }

  if (text.includes("sport") || text.includes("fussball") || text.includes("fußball") || text.includes("run") || text.includes("basket")) {
    return Zap;
  }

  if (text.includes("hangout") || text.includes("chill") || text.includes("treffen") || text.includes("stammtisch") || text.includes("meetup")) {
    return Users;
  }

  if (text.includes("club") || text.includes("bar") || text.includes("party") || text.includes("kuckuck") || text.includes("schlachthaus") || text.includes("clubhaus")) {
    return GlassWater;
  }

  return MapPin;
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

function CardMedia({ party }: { party: PartyCard }) {
  const partnerLogo = resolvePartnerLogo(party);
  const [logoFailed, setLogoFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const Icon = resolveFallbackIcon(party);

  if (partnerLogo && !logoFailed) {
    return (
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
        <img
          src={partnerLogo.src}
          alt={partnerLogo.alt}
          className="h-full w-full object-cover"
          onError={() => setLogoFailed(true)}
        />
      </div>
    );
  }

  if (!party.is_external && party.host_avatar_url && !avatarFailed) {
    return (
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
        <img
          src={party.host_avatar_url}
          alt="Host Avatar"
          className="h-full w-full object-cover"
          onError={() => setAvatarFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
      <Icon size={24} className="text-indigo-600" />
    </div>
  );
}

export function EventCard({ party, expanded, onToggle }: Props) {
  const typeTag = getTypeTag(party);
  const musicGenre = resolveMusicGenre(party);

  return (
    <motion.article
      whileTap={{ scale: 0.97 }}
      onClick={onToggle}
      className="relative overflow-hidden rounded-3xl bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
    >
      <div className="absolute right-3 top-3 z-10">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 shadow-sm backdrop-blur ${typeTag.bookmarkClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
          {typeTag.label}
        </span>
      </div>

      <div className="flex gap-3">
        <CardMedia party={party} />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5 pr-14">
            <p
              className={`w-max rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getBadgeClasses(party.vibe_label)}`}
            >
              {party.vibe_label}
            </p>
            <ChevronDown
              size={16}
              className={`text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </div>

          <h3 className="line-clamp-2 text-lg font-bold tracking-tight text-zinc-900">{party.title}</h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={14} />
              {new Intl.DateTimeFormat("de-DE", {
                timeZone: "Europe/Berlin",
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              }).format(new Date(party.starts_at))}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 size={14} />
              {new Intl.DateTimeFormat("de-DE", {
                timeZone: "Europe/Berlin",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(party.starts_at))}
              Uhr
            </span>
            {!party.is_external ? (
              <span className="inline-flex items-center gap-1">
                <Users size={14} />
                {party.spots_left} frei
              </span>
            ) : null}
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
                <div className="rounded-2xl bg-zinc-50 p-3 text-sm text-zinc-700">
                  <p>
                    <span className="font-semibold text-zinc-900">Typ:</span> {typeTag.label}
                  </p>
                  {musicGenre ? (
                    <p className="mt-1">
                      <span className="font-semibold text-zinc-900">Musik:</span> {musicGenre}
                    </p>
                  ) : null}
                  <p className="mt-1">
                    <span className="font-semibold text-zinc-900">Adresse:</span> {getAddressLine(party)}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-zinc-900">Start:</span>{" "}
                    {new Intl.DateTimeFormat("de-DE", {
                      timeZone: "Europe/Berlin",
                      dateStyle: "full",
                      timeStyle: "short",
                    }).format(new Date(party.starts_at))}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-zinc-900">Ende:</span>{" "}
                    {new Intl.DateTimeFormat("de-DE", {
                      timeZone: "Europe/Berlin",
                      dateStyle: "full",
                      timeStyle: "short",
                    }).format(new Date(party.ends_at))}
                  </p>
                  {party.description ? (
                    <p className="mt-2 text-zinc-600">
                      <span className="font-semibold text-zinc-900">Was passiert:</span> {party.description}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}
