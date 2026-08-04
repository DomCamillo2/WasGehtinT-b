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
  const detailLabel = `${event.title} — Mehr Infos. ${venueLabel}, ${dateLabel} ${timeLabel}`;

  return (
    <article
      className="group event-card-hover relative flex w-full items-center gap-3 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-card)] px-3.5 py-3"
      role="article"
    >
      <Link
        href={event.detailHref}
        className="absolute inset-0 z-[1] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/50"
        aria-label={detailLabel}
      />

      <div className="pointer-events-none relative z-[2] h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)]">
        {showMedia && mediaSrc ? (
          <Image
            src={mediaSrc}
            alt={mediaAlt}
            width={56}
            height={56}
            sizes="56px"
            className={
              hasHeroImage
                ? "h-full w-full object-cover saturate-125 contrast-110 brightness-95"
                : "h-full w-full object-contain p-1.5"
            }
            onError={() => setMediaFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-wordmark text-foreground/50">
            {initial}
          </span>
        )}
      </div>

      <div className="pointer-events-none relative z-[2] min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[1.05rem] leading-snug font-wordmark text-[color:var(--foreground)] sm:text-[21px] sm:leading-snug">
          {event.title}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm text-[color:var(--muted-foreground)]">
          <span className="flex min-w-0 max-w-[58%] items-center gap-2 sm:max-w-none">
            {partnerLogo ? (
              <DiscoverVenueLogoBadge
                src={partnerLogo.src}
                alt=""
                size="sm"
                className="border border-[color:var(--border-strong)]"
              />
            ) : (
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[color:var(--muted-foreground)]" aria-hidden="true" />
            )}
            <span className="truncate">{venueLabel}</span>
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap font-semibold tabular-nums text-[color:var(--foreground)]">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[color:var(--muted-foreground)]" aria-hidden="true" />
            <span>
              {dateLabel}, {timeLabel}
            </span>
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {n > 0 ? (
            <span className="inline-flex items-center gap-1 text-[13px] leading-none font-semibold tabular-nums text-[color:var(--accent)]">
              <span className="text-[14px] font-bold">{n}</span>
              <span className="text-[12px] font-medium text-[color:var(--muted-foreground)]">dabei</span>
            </span>
          ) : (
            <span className="text-xs font-medium tabular-nums text-[color:var(--muted-foreground)]">0 dabei</span>
          )}
          {isHot ? (
            <span className="rounded-md border border-[color:var(--accent)]/70 bg-[color:var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--primary-foreground)] sm:px-2 sm:text-[11px]">
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
            aria-label={upvotedByMe ? "Zusagen entfernen" : "Merken / Ich bin dabei"}
            className={`pointer-events-auto relative z-[3] inline-flex min-h-[40px] items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition-opacity duration-150 ${
              upvotedByMe
                ? "border-[color:var(--accent-strong)] bg-[color:var(--accent)] text-[color:var(--primary-foreground)]"
                : "border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] text-[color:var(--foreground)] hover:border-[color:var(--border-strong)]"
            } ${savePressed ? "opacity-80" : ""}`}
          >
            {upvotedByMe ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4" aria-hidden="true" />
                Dabei!
              </span>
            ) : (
              "Merken"
            )}
          </button>
        </div>
      </div>

      <span
        className="pointer-events-none relative z-[2] flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] text-[color:var(--muted-foreground)]"
        aria-hidden
      >
        <ChevronRight className="h-5 w-5" />
      </span>
    </article>
  );
}
