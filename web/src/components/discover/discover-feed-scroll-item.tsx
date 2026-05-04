"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Slightly subtler motion for compact list rows */
  variant?: "card" | "list";
  /** When true, gentle scroll-snap on mobile (card column only) */
  scrollSnap?: boolean;
  className?: string;
};

export function DiscoverFeedScrollItem({
  children,
  variant = "card",
  scrollSnap = false,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    if (reduceMotion) {
      setRevealed(true);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
          }
        }
      },
      {
        root: null,
        /* Top expansion so above-the-fold items reveal on first paint without a flash */
        rootMargin: "18% 0px -8% 0px",
        threshold: [0, 0.03, 0.1],
      },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const snapClass = scrollSnap ? "discover-feed-scroll-snap" : "";
  const variantClass =
    variant === "list" ? "discover-feed-scroll-item--list" : "discover-feed-scroll-item--card";

  return (
    <div
      ref={ref}
      className={`discover-feed-scroll-item w-full ${variantClass} ${revealed ? "is-revealed" : ""} ${snapClass} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
