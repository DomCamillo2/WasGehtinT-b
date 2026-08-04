"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { easeOut, dur } from "@/lib/discover-motion";
import { SITE_LOGO_SRC } from "@/lib/site-config";
import { useWelcomeScrollMotion } from "@/lib/welcome-scroll-motion";

/** Full-bleed Tübingen nightlife atmosphere — cool crowd / evening energy */
const HERO_SRC =
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1800&q=80";

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: dur.panel + 0.15, ease: easeOut },
  },
};

const fade = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: dur.panel, ease: easeOut },
  },
};

export function WelcomePage() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);

  useWelcomeScrollMotion({
    enabled: !reduce,
    heroRef,
    scrimRef,
  });

  return (
    <main className="relative isolate min-h-[140dvh] overflow-x-hidden bg-[color:var(--background)] text-[color:var(--foreground)]">
      <div className="sticky top-0 isolate min-h-dvh overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div ref={heroRef} className="absolute inset-0 will-change-transform">
            <motion.div
              className="absolute inset-0"
              initial={reduce ? false : { scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: reduce ? 0 : 1.5, ease: easeOut }}
            >
              <Image
                src={HERO_SRC}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
            </motion.div>
          </div>
          <div
            ref={scrimRef}
            className="absolute inset-0"
            style={{ background: "var(--hero-scrim)" }}
            aria-hidden
          />
          <div
            className="absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 20% 10%, rgba(79,118,105,0.28), transparent 55%)",
            }}
            aria-hidden
          />
        </div>

        <header className="relative z-10 flex items-center justify-between px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pt-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
            aria-label="WasGehtTüb Start"
          >
            <Image
              src={SITE_LOGO_SRC}
              alt=""
              width={40}
              height={40}
              className="h-9 w-9 object-contain drop-shadow-sm"
              priority
            />
          </Link>
          <ThemeToggle className="!rounded-xl !border-white/25 !bg-black/40 !text-white" />
        </header>

        <motion.section
          className="relative z-10 mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-3xl flex-col justify-end px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-16 sm:px-8 sm:pb-14"
          variants={reduce ? undefined : stagger}
          initial={reduce ? false : "hidden"}
          animate="show"
        >
          <motion.div variants={reduce ? undefined : fadeUp}>
            <p className="welcome-wordmark-reveal font-wordmark text-5xl leading-[0.95] tracking-tight text-white sm:text-6xl md:text-7xl">
              WasGehtTüb
            </p>
          </motion.div>

          <motion.h1
            className="mt-5 max-w-xl text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl"
            variants={reduce ? undefined : fadeUp}
          >
            Was geht heut’ in Tübingen?
          </motion.h1>

          <motion.p
            className="mt-3 max-w-md text-base leading-relaxed text-white/78 sm:text-lg"
            variants={reduce ? undefined : fade}
          >
            Clubs, Konzerte und Campus — dein Radar für Studis, spontan und ohne Stress.
          </motion.p>

          <motion.div className="mt-8 w-full max-w-md" variants={reduce ? undefined : fadeUp}>
            <Link
              href="/discover"
              className="welcome-cta inline-flex h-12 w-full items-center justify-center rounded-xl bg-[color:var(--accent)] px-5 text-sm font-semibold text-[color:var(--accent-dark-text)] sm:w-auto sm:min-w-[12rem]"
            >
              Entdecken
            </Link>
          </motion.div>

          <motion.p className="mt-5 text-xs text-white/55" variants={reduce ? undefined : fade}>
            <Link href="/impressum" className="underline decoration-white/30 underline-offset-2">
              Impressum
            </Link>
            {" · "}
            <Link href="/datenschutz" className="underline decoration-white/30 underline-offset-2">
              Datenschutz
            </Link>
          </motion.p>
        </motion.section>
      </div>

      {/* Scroll runway for GSAP scrub — keeps sticky hero while user scrolls */}
      <div className="pointer-events-none h-[40dvh]" aria-hidden />
    </main>
  );
}
