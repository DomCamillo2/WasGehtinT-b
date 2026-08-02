"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Slightly subtler motion for compact list rows */
  variant?: "card" | "list";
  /** When true, gentle scroll-snap on mobile (card column only) */
  scrollSnap?: boolean;
  className?: string;
};

/**
 * Feed item shell. No scroll-reveal fade-up (anti-slop: motion communicates state,
 * not decoration). Keeps scroll-snap hooks for mobile card browsing.
 */
export function DiscoverFeedScrollItem({
  children,
  variant = "card",
  scrollSnap = false,
  className = "",
}: Props) {
  const snapClass = scrollSnap ? "discover-feed-scroll-snap" : "";
  const variantClass =
    variant === "list" ? "discover-feed-scroll-item--list" : "discover-feed-scroll-item--card";

  return (
    <div className={`discover-feed-scroll-item w-full ${variantClass} ${snapClass} ${className}`.trim()}>
      {children}
    </div>
  );
}
