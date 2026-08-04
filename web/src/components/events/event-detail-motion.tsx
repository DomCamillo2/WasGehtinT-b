"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { dur, easeOut } from "@/lib/discover-motion";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Light enter for event-detail sections — state, not decoration soup. */
export function EventDetailMotion({ children, className, delay = 0 }: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : dur.panel,
        ease: easeOut,
        delay: reduce ? 0 : delay,
      }}
    >
      {children}
    </motion.div>
  );
}
