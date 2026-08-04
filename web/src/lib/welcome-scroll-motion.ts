"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Props = {
  enabled: boolean;
  heroRef: React.RefObject<HTMLElement | null>;
  scrimRef: React.RefObject<HTMLElement | null>;
};

/**
 * Welcome-only scroll depth (GSAP ScrollTrigger).
 * Parallax + scrim deepen — no pin, no bounce, no glow.
 */
export function useWelcomeScrollMotion({ enabled, heroRef, scrimRef }: Props) {
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const hero = heroRef.current;
    const scrim = scrimRef.current;
    if (!hero) return;

    gsap.registerPlugin(ScrollTrigger);
    ctxRef.current = gsap.context(() => {
      gsap.to(hero, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: {
          trigger: document.documentElement,
          start: "top top",
          end: "+=70%",
          scrub: true,
        },
      });

      if (scrim) {
        gsap.fromTo(
          scrim,
          { opacity: 0.85 },
          {
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: document.documentElement,
              start: "top top",
              end: "+=55%",
              scrub: true,
            },
          },
        );
      }
    });

    return () => {
      ctxRef.current?.revert();
      ctxRef.current = null;
    };
  }, [enabled, heroRef, scrimRef]);
}
