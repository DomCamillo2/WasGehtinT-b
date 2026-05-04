"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight, Clock, MapPin } from "lucide-react";
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

export function DiscoverEventListItemV2({
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
  const mediaSrc = event.heroImageUrl ?? partnerLogo?.src ?? null;
  const mediaAlt = hasHeroImage ? `Eventbild für ${event.title}` : "";
  const [mediaFailed, setMediaFailed] = useState(false);
  const showMedia = Boolean(mediaSrc && !mediaFailed);
  const [savePressed, setSavePressed] = useState(false);

  const n = Math.max(0, upvoteCount);

  return (
    <article
      className="group relative flex w-full items-center gap-3 rounded-2xl border border-[#2B2623] bg-[linear-gradient(180deg,#151210_0%,#12100e_100%)] px-3.5 py-3 shadow-[0_12px_32px_-26px_rgba(255,122,24,0.5)] [content-visibility:auto] [contain-intrinsic-size:auto_4.5rem] transition-[border-color,box-shadow] duration-150 hover:border-[#3A312B] hover:shadow-[0_20px_44px_-28px_rgba(255,122,24,0.7)]"
      role="article"
      aria-label={`${event.title} in ${venueLabel}, ${dateLabel} ${timeLabel}`}
    >
      <Link
        href={event.detailHref}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#3A312B] bg-[#171310]"
      >
        {showMedia && mediaSrc ? (
          <Image
            src={mediaSrc}
            alt={mediaAlt}
            width={56}
            height={56}
            sizes="56px"
            className={hasHeroImage ? "h-full w-full object-cover saturate-125 contrast-110 brightness-95" : "h-full w-full object-contain p-1.5"}
            onError={() => setMediaFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-wordmark text-foreground/50">
            {initial}
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={event.detailHref}
          className="block rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <h3 className="truncate text-[21px] leading-none font-wordmark text-[#F2ECE6]">
            {event.title}
          </h3>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm text-[#8C8178]">
          <span className="flex min-w-0 max-w-[58%] items-center gap-2 sm:max-w-none">
            {partnerLogo ? (
              <DiscoverVenueLogoBadge
                src={partnerLogo.src}
                alt=""
                size="sm"
                className="border border-[#5a4a3f]/50"
              />
            ) : (
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#756a61]" aria-hidden="true" />
            )}
            <span className="truncate">{venueLabel}</span>
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap font-semibold tabular-nums text-[#A69A91]">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[#756a61]" aria-hidden="true" />
            <span>
              {dateLabel}, {timeLabel}
            </span>
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {n > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[13px] leading-none font-semibold tabular-nums text-primary">
              <span className="text-[14px] font-bold">{n}</span>
              <span className="text-[12px] font-medium text-[#EAA16B]">dabei</span>
            </span>
          ) : (
            <span className="text-xs font-medium tabular-nums text-[#8C8178]">0 dabei</span>
          )}
          {isHot ? (
            <span className="rounded-full border border-[#ff9a3f]/80 bg-[#ff7a18] px-1.5 py-0.5 text-[10px] font-semibold text-[#2D1D10] sm:px-2 sm:text-[11px]">
              Im Trend
            </span>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onUpvote();
            }}
            onMouseDown={() => setSavePressed(true)}
            onMouseUp={() => setSavePressed(false)}
            onMouseLeave={() => setSavePressed(false)}
            onTouchStart={() => setSavePressed(true)}
            onTouchEnd={() => setSavePressed(false)}
            aria-pressed={upvotedByMe}
            aria-label={upvotedByMe ? "Zusagen entfernen" : "Ich bin dabei!"}
            className={`inline-flex min-h-[40px] items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              upvotedByMe
                ? "wg-cta-confirmed border-[#ff9a3f] bg-[#ff7a18] text-[#2D1D10] shadow-[0_8px_20px_-16px_rgba(255,122,24,0.9)]"
                : "wg-cta-attention border-[#3A312B] bg-[#1A1715] text-[#E9DFD6] hover:border-[#4A3D34] hover:text-white"
            } ${savePressed ? "scale-95" : "scale-100"}`}
          >
            {upvotedByMe ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4" aria-hidden="true" />
                Dabei!
              </span>
            ) : (
              "Ich bin dabei!"
            )}
          </button>
        </div>
      </div>

      <Link
        href={event.detailHref}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#2B2623] bg-[#1A1715]/90 text-[#8C8178] transition-colors hover:border-[#3A312B] hover:text-[#E9DFD6]"
        aria-label="Details anzeigen"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </article>
  );
}
