"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight, Flame } from "lucide-react";
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
        className="hidden -space-x-1 shrink-0 sm:flex sm:-space-x-1.5"
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
          <div className="relative z-0 hidden h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-stone-900/80 bg-stone-900 text-[7px] font-bold text-stone-200 sm:flex sm:h-7 sm:w-7 sm:text-[9px]">
            +{overflow}
          </div>
        ) : null}
      </div>
      <span className="whitespace-nowrap text-[10px] font-medium tabular-nums text-[#c9bfb6] sm:text-xs sm:text-[#e8e1db]">
        {n} dabei
      </span>
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
      className="group relative w-full overflow-hidden rounded-2xl border border-transparent [contain-intrinsic-size:auto_10rem] card-lift max-sm:border-[#2a2623]/70 max-sm:shadow-[0_8px_28px_-12px_rgba(0,0,0,0.55)] sm:rounded-none sm:border-0 sm:shadow-none"
      role="article"
    >
      <div className="relative w-full">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl sm:aspect-[3/1] md:aspect-[5/1] sm:rounded-none">
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
              sizes="(max-width: 767px) min(100vw, 448px), (max-width: 1279px) min(50vw, 720px), min(720px, 40vw)"
              priority={imagePriority}
              quality={imagePriority ? 80 : 68}
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
          className="absolute inset-0 z-[2] max-sm:bg-[linear-gradient(to_top,rgba(10,8,7,0.97)_0%,rgba(12,10,9,0.72)_38%,rgba(12,10,9,0.22)_72%,rgba(12,10,9,0.05)_100%)] sm:[background:linear-gradient(to_top,rgba(12,10,9,0.95)_0%,rgba(12,10,9,0.55)_45%,rgba(12,10,9,0.1)_100%)]"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 right-0 z-[2] max-sm:h-14 sm:h-[96px]"
          style={{
            background: "linear-gradient(to top, rgba(255,122,24,0.1) 0%, rgba(255,122,24,0) 100%)",
          }}
          aria-hidden="true"
        />

        {isHot ? (
          <div className="pointer-events-none absolute left-3 top-3 z-[6] inline-flex items-center gap-1 rounded-full border border-[#ff9a3f]/70 bg-[#2D1D10]/85 px-2 py-0.5 text-[10px] font-semibold text-[#ffc48a] shadow-sm sm:left-4 sm:top-4 sm:px-2.5 sm:py-1 sm:text-xs">
            <Flame className="h-3 w-3 shrink-0 text-[#ff9a3f] sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            Im Trend
          </div>
        ) : null}

        {/* Mobile: title → meta row → date → CTA (clear vertical rhythm). Desktop: unchanged split. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] px-3 pb-3 pt-1 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-2 sm:gap-2">
              <h3 className="min-w-0 text-base font-semibold leading-snug tracking-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85),0_2px_12px_rgba(0,0,0,0.45)] line-clamp-2 sm:text-2xl sm:leading-snug sm:drop-shadow-sm sm:[text-shadow:none]">
                {event.title}
              </h3>
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-medium text-[#e0d8cf] sm:flex-none sm:gap-2 sm:text-xs">
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
                <span className="text-[#5c534c] sm:hidden" aria-hidden="true">
                  ·
                </span>
                <div className="shrink-0 sm:w-full sm:pt-0">
                  <InterestStack count={upvoteCount} hostAvatarUrl={event.hostAvatarUrl} />
                </div>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col items-stretch gap-2.5 sm:w-auto sm:items-end sm:justify-start sm:gap-2.5 sm:flex-col">
              <div className="pointer-events-none flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-black/35 px-2.5 py-1.5 backdrop-blur-[2px] sm:w-fit sm:justify-start sm:gap-2 sm:self-end sm:rounded-full sm:border-stone-500/60 sm:bg-stone-950/90 sm:px-3.5 sm:py-2 sm:backdrop-blur-none">
                <time
                  className="text-[11px] font-semibold tabular-nums text-[#f2ece6] sm:text-sm"
                  dateTime={event.startsAt}
                >
                  {dateLabel}
                </time>
                <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-stone-400/90" aria-hidden="true" />
                <span className="text-[11px] font-semibold tabular-nums text-[#ebe4dd] sm:text-sm">{timeLabel}</span>
              </div>
              <button
                type="button"
                data-state={upvotedByMe ? "confirmed" : "idle"}
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
                className={clsx(
                  "group/dabei wg-cta-interactive pointer-events-auto relative z-[1] flex min-h-[44px] w-full touch-manipulation select-none items-center justify-center gap-1.5 overflow-hidden rounded-xl px-3 py-2.5 text-[11px] font-semibold sm:h-auto sm:min-h-[44px] sm:w-auto sm:gap-2 sm:rounded-full sm:px-6 sm:py-2.5 sm:text-sm",
                  "motion-safe:transition-[transform,box-shadow,filter] motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9a3f]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141210]",
                  upvotedByMe
                    ? [
                        "wg-cta-confirmed border border-[#ffc48a]/90 bg-gradient-to-b from-[#ff9a3f] to-[#ff7a18] text-[#2D1D10]",
                        "shadow-[0_10px_26px_-14px_rgba(255,122,24,0.95),inset_0_1px_0_0_rgba(255,255,255,0.38)]",
                        "hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-14px_rgba(255,122,24,0.58),inset_0_1px_0_0_rgba(255,255,255,0.42)]",
                      ]
                    : [
                        "wg-cta-attention",
                        "max-sm:bg-gradient-to-b max-sm:from-[#ff8d3d] max-sm:via-[#ff7a18] max-sm:to-[#e86c14] max-sm:border max-sm:border-[#ffc48a]/50 max-sm:text-[#2D1D10]",
                        "max-sm:shadow-[0_12px_28px_-12px_rgba(255,122,24,0.58),inset_0_1px_0_0_rgba(255,255,255,0.42)] max-sm:active:brightness-[0.96]",
                        "max-sm:hover:-translate-y-0.5 max-sm:hover:shadow-[0_16px_34px_-14px_rgba(255,122,24,0.52),inset_0_1px_0_0_rgba(255,255,255,0.45)]",
                        "sm:border sm:border-[#2B2623] sm:bg-[#1A1715]/92 sm:text-[#E9DFD6]",
                        "sm:shadow-[0_8px_22px_-16px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
                        "sm:hover:border-[#ff7a18]/55 sm:hover:bg-[#221e1b]/95 sm:hover:text-white sm:hover:-translate-y-0.5",
                        "sm:hover:shadow-[0_12px_36px_-18px_rgba(255,122,24,0.42),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
                      ],
                  ctaPressed && [
                    "motion-safe:translate-y-1 motion-safe:scale-[0.97]",
                    upvotedByMe
                      ? "motion-safe:shadow-[0_4px_14px_-10px_rgba(255,122,24,0.5),inset_0_3px_12px_rgba(0,0,0,0.2)]"
                      : [
                          "max-sm:motion-safe:shadow-[0_4px_14px_-10px_rgba(255,122,24,0.48),inset_0_3px_12px_rgba(0,0,0,0.2)]",
                          "sm:motion-safe:shadow-[0_2px_12px_-10px_rgba(0,0,0,0.62),inset_0_3px_10px_rgba(0,0,0,0.42)]",
                        ],
                  ],
                )}
              >
                <span
                  className={clsx(
                    "pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 via-white/5 to-transparent",
                    upvotedByMe ? "opacity-45" : "max-sm:opacity-70 sm:opacity-0",
                  )}
                  aria-hidden="true"
                />
                {upvotedByMe ? (
                  <>
                    <Check className="relative z-[1] h-3.5 w-3.5 motion-safe:transition-transform motion-safe:duration-150 sm:h-4 sm:w-4" aria-hidden="true" />
                    <span className="relative z-[1] font-semibold tracking-tight">Dabei!</span>
                  </>
                ) : (
                  <>
                    <span className="relative z-[1] font-semibold tracking-tight">Ich bin dabei!</span>
                    <ChevronRight
                      className="relative z-[1] h-3.5 w-3.5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out group-hover/dabei:translate-x-0.5 group-active/dabei:translate-x-1 sm:h-4 sm:w-4"
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="event-card-separator" aria-hidden="true" />

      <Link
        href={event.detailHref}
        className="absolute inset-0 z-[4] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-0 sm:rounded-none"
        aria-label={detailLabel}
      />
      </div>
      {showConfirmation ? (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xl animate-bounce-in sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            Gespeichert
          </span>
        </div>
      ) : null}
    </article>
  );
}
