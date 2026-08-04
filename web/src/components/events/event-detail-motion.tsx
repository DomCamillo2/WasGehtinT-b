"use client";

import type { ReactNode, CSSProperties } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** CSS enter for event-detail — avoids pulling full framer-motion on every section. */
export function EventDetailMotion({ children, className, delay = 0 }: Props) {
  return (
    <div
      className={`wg-detail-enter ${className ?? ""}`.trim()}
      style={{ "--wg-enter-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}
