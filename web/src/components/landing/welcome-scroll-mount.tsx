"use client";

import { useWelcomeScrollMotion } from "@/lib/welcome-scroll-motion";

type Props = {
  enabled: boolean;
  heroRef: React.RefObject<HTMLElement | null>;
  scrimRef: React.RefObject<HTMLElement | null>;
};

/** Isolated so GSAP + ScrollTrigger load only after Welcome hydrates. */
export function WelcomeScrollMount(props: Props) {
  useWelcomeScrollMotion(props);
  return null;
}
