/**
 * Discover motion primitives — state feedback only (anti-slop).
 * Stack: framer-motion LazyMotion + CSS tokens from Anti-AI-UI / animations.dev recipes.
 * Ban: universal fade-up, hover:scale-105, glow pulses, decorative spring defaults.
 */
"use client";

import {
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  AnimatePresence,
  type Transition,
} from "framer-motion";
import type { ReactNode } from "react";

/** Ease-out enter — Material / Anti-AI-UI animation.md */
export const easeOut: [number, number, number, number] = [0, 0, 0.2, 1];
/** Ease-in leave — exits feel snappier */
export const easeIn: [number, number, number, number] = [0.4, 0, 1, 1];

export const dur = {
  micro: 0.12,
  hover: 0.15,
  panel: 0.25,
  exit: 0.18,
} as const;

export function enterTransition(reduce: boolean | null): Transition {
  if (reduce) return { duration: 0 };
  return { duration: dur.panel, ease: easeOut };
}

export function exitTransition(reduce: boolean | null): Transition {
  if (reduce) return { duration: 0 };
  return { duration: dur.exit, ease: easeIn };
}

export function DiscoverMotionRoot({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}

export { m, useReducedMotion, AnimatePresence };
