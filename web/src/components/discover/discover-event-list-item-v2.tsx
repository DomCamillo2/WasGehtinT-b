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
  const mediaSrc = event.heroImageUrl ?? null;
  const mediaAlt = hasHeroImage ? `Eventbild für ${event.title}` : "";
  const [mediaFailed, setMediaFailed] = useState(false);
  const showMedia = Boolean(mediaSrc && !mediaFailed);
  const [savePressed, setSavePressed] = useState(false);

  const n = Math.max(0, upvoteCount);

  return (
    <article
      className="group event-card-hover relative flex w-full items-center gap-3 rounded-lg border border-[rgba(240,235,228,0.12)] bg-[#1c1815] px-3.5 py-3"
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
          <h3 className="line-clamp-2 text-[1.05rem] leading-snug font-wordmark text-[#F2ECE6] sm:text-[21px] sm:leading-snug">
            {event.title}
          </h3>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm text-[#c9beb4]">
          <span className="flex min-w-0 max-w-[58%] items-center gap-2 sm:max-w-none">
            {partnerLogo ? (
              <DiscoverVenueLogoBadge
                src={partnerLogo.src}
                alt=""
                size="sm"
                className="border border-[#5a4a3f]/50"
              />
            ) : (
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#9a8f86]" aria-hidden="true" />
            )}
            <span className="truncate">{venueLabel}</span>
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap font-semibold tabular-nums text-[#dcd4cc]">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[#9a8f86]" aria-hidden="true" />
            <span>
              {dateLabel}, {timeLabel}
            </span>
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {n > 0 ? (
            <span className="inline-flex items-center gap-1 text-[13px] leading-none font-semibold tabular-nums text-[#c4783a]">
              <span className="text-[14px] font-bold">{n}</span>
              <span className="text-[12px] font-medium text-[#9a9086]">dabei</span>
            </span>
          ) : (
            <span className="text-xs font-medium tabular-nums text-[#6f675f]">0 dabei</span>
          )}
          {isHot ? (
            <span className="rounded-md border border-[#c4783a]/70 bg-[#c4783a] px-1.5 py-0.5 text-[10px] font-semibold text-[#1c1410] sm:px-2 sm:text-[11px]">
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
            className={`inline-flex min-h-[40px] items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition-opacity duration-150 ${
              upvotedByMe
                ? "border-[#d9a06a] bg-[#c4783a] text-[#1c1410]"
                : "border-[rgba(240,235,228,0.14)] bg-[#221e1a] text-[#f0ebe4] hover:border-[rgba(240,235,228,0.28)]"
            } ${savePressed ? "opacity-80" : ""}`}
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
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[rgba(240,235,228,0.12)] bg-[#221e1a] text-[#9a9086] transition-colors hover:border-[rgba(240,235,228,0.22)] hover:text-[#f0ebe4]"
        aria-label="Details anzeigen"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </article>
  );
}
