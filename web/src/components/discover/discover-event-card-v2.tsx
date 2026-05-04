"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { SITE_LOGO_SRC } from "@/lib/site-config";
import type { DiscoverEvent } from "@/services/discover/discover-view-model";
import { resolveDiscoverVenuePartnerLogo } from "@/lib/discover-venue-visual";
import { DiscoverVenueLogoBadge } from "./discover-venue-logo-badge";

type Props = {
  event: DiscoverEvent;
  isHot: boolean;
  upvoteCount: number;
  upvotedByMe: boolean;
  dateLabel: string;
  timeLabel: string;
  venueLabel: string;
  onUpvote: () => void;
};

function InterestStack({ count, hostAvatarUrl }: { count: number; hostAvatarUrl: string | null }) {
  const n = Math.max(0, count);
  if (n <= 0) {
    return (
      <span className="text-xs font-medium text-stone-100/90 tabular-nums">0 dabei</span>
    );
  }
  const showOverflow = n > 3;
  const overflow = n - 3;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className="flex -space-x-1.5 shrink-0"
        aria-label={n === 1 ? "1 Person interessiert" : `${n} Personen interessiert`}
      >
        {Array.from({ length: Math.min(3, n) }, (_, i) => {
          const isFirst = i === 0 && hostAvatarUrl;
          return (
            <div
              key={i}
              className="relative h-7 w-7 shrink-0 rounded-full border-2 border-stone-900/80 overflow-hidden bg-stone-800"
              style={{ zIndex: 3 - i }}
            >
              {isFirst ? (
                <Image src={hostAvatarUrl} alt="" width={28} height={28} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full bg-gradient-to-br from-primary/55 to-secondary/45"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
        {showOverflow ? (
          <div className="relative z-0 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-stone-900/80 bg-stone-900 text-[9px] font-bold text-stone-300">
            +{overflow}
          </div>
        ) : null}
      </div>
      <span className="text-xs font-medium text-stone-100/90 tabular-nums">{n} dabei</span>
    </div>
  );
}

export function DiscoverEventCardV2({
  event,
  isHot,
  upvoteCount,
  upvotedByMe,
  dateLabel,
  timeLabel,
  venueLabel,
  onUpvote,
}: Props) {
  const initial = (event.title?.trim().charAt(0) ?? "?").toUpperCase();
  const partnerLogo = resolveDiscoverVenuePartnerLogo(event);
  const hasHeroImage = typeof event.heroImageUrl === "string" && event.heroImageUrl.length > 0;
  const mediaSrc = event.heroImageUrl ?? null;
  const mediaAlt = hasHeroImage ? `Eventbild für ${event.title}` : "";
  const [mediaFailed, setMediaFailed] = useState(false);
  const showMedia = Boolean(mediaSrc && !mediaFailed);
  const [ctaPressed, setCtaPressed] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (!showConfirmation) return;
    const timer = window.setTimeout(() => setShowConfirmation(false), 1400);
    return () => window.clearTimeout(timer);
  }, [showConfirmation]);

  return (
    <article
      className="group relative w-full overflow-hidden rounded-none [content-visibility:auto] [contain-intrinsic-size:auto_15rem] card-lift"
      role="article"
      aria-label={`${event.title} in ${venueLabel}, ${dateLabel} ${timeLabel}`}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-none">
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/25 via-muted to-secondary/20"
          aria-hidden="true"
        />
        <div
          className={`absolute inset-0 z-[1] transition-transform duration-700 ease-out ${showMedia ? "group-hover:scale-105" : ""}`}
        >
          {showMedia && mediaSrc ? (
            <Image
              src={mediaSrc}
              alt={mediaAlt}
              fill
              sizes="100vw"
              className={
                hasHeroImage
                  ? "object-cover object-center saturate-125 contrast-110 brightness-95"
                  : "object-contain object-center p-8 sm:p-10"
              }
              onError={() => setMediaFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-5xl font-wordmark text-foreground/20">
              {initial}
            </div>
          )}
        </div>
        <div
          className="absolute inset-0 z-[2]"
          style={{
            background:
              "linear-gradient(to top, rgba(12,10,9,0.95) 0%, rgba(12,10,9,0.55) 45%, rgba(12,10,9,0.1) 100%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 z-[2]"
          style={{
            height: "96px",
            background: "linear-gradient(to top, rgba(255,122,24,0.12) 0%, rgba(255,122,24,0) 100%)",
          }}
          aria-hidden="true"
        />

        <div
          className="absolute right-4 top-4 z-[3] flex h-9 w-9 items-center justify-center rounded-full border border-[#2B2623] bg-[#17120f]/85 shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
          aria-hidden="true"
        >
          <Image src={SITE_LOGO_SRC} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
        </div>

        {/* Mock layout: links Titel → Venue → Social, rechts Datum-Pille + CTA */}
        <div className="absolute inset-x-0 bottom-0 z-[3] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Link
                href={event.detailHref}
                className="block min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-sm"
              >
                <h3 className="text-xl sm:text-2xl font-semibold leading-snug tracking-tight text-white drop-shadow-sm line-clamp-2">
                  {event.title}
                </h3>
              </Link>
              <p className="flex min-w-0 items-center gap-2 text-xs font-medium text-stone-200/95">
                {partnerLogo ? (
                  <DiscoverVenueLogoBadge
                    src={partnerLogo.src}
                    alt=""
                    size="md"
                    className="border border-stone-300/40 shadow-sm"
                  />
                ) : (
                  <span className="h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                )}
                <span className="truncate">{venueLabel}</span>
              </p>
              <InterestStack count={upvoteCount} hostAvatarUrl={event.hostAvatarUrl} />
            </div>

            <div className="flex w-full shrink-0 items-center justify-between gap-2.5 sm:w-auto sm:flex-col sm:items-end sm:justify-start">
              <div className="flex items-center gap-2 rounded-full border border-stone-600/50 bg-stone-950/90 px-3 py-1.5 sm:px-3.5 sm:py-2">
                <time className="text-sm font-semibold tabular-nums text-stone-100" dateTime={event.startsAt}>
                  {dateLabel}
                </time>
                <span className="h-0.5 w-0.5 rounded-full bg-stone-400" aria-hidden="true" />
                <span className="text-sm font-semibold tabular-nums text-stone-200">{timeLabel}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!upvotedByMe) {
                    setShowConfirmation(true);
                  }
                  onUpvote();
                }}
                onMouseDown={() => setCtaPressed(true)}
                onMouseUp={() => setCtaPressed(false)}
                onMouseLeave={() => setCtaPressed(false)}
                onTouchStart={() => setCtaPressed(true)}
                onTouchEnd={() => setCtaPressed(false)}
                aria-pressed={upvotedByMe}
                aria-label={upvotedByMe ? "Zusagen entfernen" : "Ich bin dabei!"}
                className={`relative min-h-[44px] px-4 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 flex items-center gap-2 shadow-md sm:px-5 ${
                  upvotedByMe
                    ? "wg-cta-confirmed bg-[#ff7a18] text-[#2D1D10] border border-[#ff9a3f] shadow-[0_10px_24px_-14px_rgba(255,122,24,0.95)]"
                    : "wg-cta-attention bg-[#1A1715]/92 text-[#E9DFD6] border border-[#2B2623] hover:border-[#3A312B] hover:text-white"
                } ${ctaPressed ? "scale-95" : "scale-100"}`}
              >
                {upvotedByMe ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>Dabei!</span>
                  </>
                ) : (
                  <>
                    <span>Ich bin dabei!</span>
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showConfirmation ? (
        <div
          className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-2xl animate-bounce-in"
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4" aria-hidden="true" />
            Gespeichert
          </span>
        </div>
      ) : null}
      <div className="event-card-separator" aria-hidden="true" />
    </article>
  );
}
