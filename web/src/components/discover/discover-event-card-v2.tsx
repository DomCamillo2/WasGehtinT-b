"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import type { DiscoverEvent } from "@/services/discover/discover-view-model";
import { resolveDiscoverVenuePartnerLogo } from "@/lib/discover-venue-visual";
import { DiscoverVenueLogoBadge } from "./discover-venue-logo-badge";

type Props = {
  event: DiscoverEvent;
  /** Hint Next/Image to preload above-the-fold card media (mobile LCP). */
  imagePriority?: boolean;
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
      <span className="text-[10px] font-medium tabular-nums text-[#e8e1db] sm:text-xs">0 dabei</span>
    );
  }
  const showOverflow = n > 3;
  const overflow = n - 3;

  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-2">
      <div
        className="flex -space-x-1 shrink-0 sm:-space-x-1.5"
        aria-label={n === 1 ? "1 Person interessiert" : `${n} Personen interessiert`}
      >
        {Array.from({ length: Math.min(3, n) }, (_, i) => {
          const isFirst = i === 0 && hostAvatarUrl;
          return (
            <div
              key={i}
              className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full border-2 border-stone-900/80 bg-stone-800 sm:h-7 sm:w-7"
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
          <div className="relative z-0 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-stone-900/80 bg-stone-900 text-[7px] font-bold text-stone-200 sm:h-7 sm:w-7 sm:text-[9px]">
            +{overflow}
          </div>
        ) : null}
      </div>
      <span className="text-[10px] font-medium tabular-nums text-[#e8e1db] sm:text-xs">{n} dabei</span>
    </div>
  );
}

export function DiscoverEventCardV2({
  event,
  imagePriority = false,
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

  const detailLabel = `${event.title} — ${venueLabel}, ${dateLabel} ${timeLabel}`;

  return (
    <article
      className="group relative w-full overflow-hidden rounded-none [contain-intrinsic-size:auto_10rem] card-lift"
      role="article"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-none sm:aspect-[3/1] md:aspect-[5/1]">
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/25 via-muted to-secondary/20"
          aria-hidden="true"
        />
        <div
          className={`absolute inset-0 z-[1] transition-transform duration-700 ease-out ${showMedia ? "scale-100 sm:scale-105 sm:group-hover:scale-110" : ""}`}
        >
          {showMedia && mediaSrc ? (
            <Image
              src={mediaSrc}
              alt={mediaAlt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, min(1200px, 100vw)"
              priority={imagePriority}
              className={
                hasHeroImage
                  ? "object-cover object-center saturate-125 contrast-110 brightness-95"
                  : "object-contain object-center p-6 sm:p-8 md:p-10"
              }
              onError={() => setMediaFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-2xl font-wordmark text-foreground/[0.12] sm:text-4xl sm:text-foreground/15">
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
          className="absolute bottom-0 left-0 right-0 z-[2] max-sm:h-[72px] sm:h-[96px]"
          style={{
            background: "linear-gradient(to top, rgba(14,17,16,0.55) 0%, rgba(14,17,16,0) 100%)",
          }}
          aria-hidden="true"
        />

        <Link
          href={event.detailHref}
          className="absolute inset-0 z-[4] outline-none focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-0"
          aria-label={detailLabel}
        />

        {isHot ? (
          <div className="pointer-events-none absolute left-3 top-3 z-[6] border-l-2 border-[#d48745] bg-[#0e1110]/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#dea46b] sm:left-4 sm:top-4 sm:text-[11px]">
            Trend
          </div>
        ) : null}

        {/* Mock layout: Titel → Venue → Social, Datum-Pille + CTA (Klicks außer Upvote → Detail) */}
        <div className="absolute inset-x-0 bottom-0 z-[5] p-2.5 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-2">
              <h3 className="min-w-0 text-[1.05rem] font-semibold leading-snug tracking-tight text-white drop-shadow-sm line-clamp-2 sm:text-2xl sm:leading-snug">
                {event.title}
              </h3>
              <p className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-[#e8e1db] sm:gap-2 sm:text-xs">
                {partnerLogo ? (
                  <>
                    <span className="h-1 w-1 shrink-0 rounded-full bg-primary sm:hidden" aria-hidden="true" />
                    <DiscoverVenueLogoBadge
                      src={partnerLogo.src}
                      alt=""
                      size="md"
                      className="hidden border border-stone-300/40 shadow-sm sm:inline-flex"
                    />
                  </>
                ) : (
                  <span className="h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                )}
                <span className="truncate">{venueLabel}</span>
              </p>
              <InterestStack count={upvoteCount} hostAvatarUrl={event.hostAvatarUrl} />
            </div>

            <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end sm:justify-start sm:gap-2.5 sm:flex-col">
              <div className="pointer-events-none flex w-fit max-w-full items-center gap-1 self-end rounded-full border border-stone-500/60 bg-stone-950/90 px-2 py-1 sm:gap-2 sm:px-3.5 sm:py-2 max-sm:self-stretch max-sm:justify-center">
                <time
                  className="text-[10px] font-semibold tabular-nums text-[#f2ece6] sm:text-sm"
                  dateTime={event.startsAt}
                >
                  {dateLabel}
                </time>
                <span className="h-0.5 w-0.5 rounded-full bg-stone-300/90" aria-hidden="true" />
                <span className="text-[10px] font-semibold tabular-nums text-[#ebe4dd] sm:text-sm">{timeLabel}</span>
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
                className={`pointer-events-auto relative z-[1] flex min-h-[44px] w-full max-sm:min-h-[48px] max-sm:justify-center sm:h-auto sm:w-auto sm:min-h-[44px] items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-opacity duration-150 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm ${
                  upvotedByMe
                    ? "bg-[#d48745] text-[#2e1f1a] border border-[#dea46b]"
                    : "bg-[#181c1b]/95 text-[#e8ecea] border border-[rgba(232,236,234,0.14)] hover:border-[rgba(232,236,234,0.28)]"
                } ${ctaPressed ? "opacity-80" : ""}`}
              >
                {upvotedByMe ? (
                  <>
                    <Check className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                    <span>Dabei!</span>
                  </>
                ) : (
                  <>
                    <span>Ich bin dabei!</span>
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showConfirmation ? (
        <div
          className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xl animate-bounce-in sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            Gespeichert
          </span>
        </div>
      ) : null}
      <div className="event-card-separator" aria-hidden="true" />
    </article>
  );
}
