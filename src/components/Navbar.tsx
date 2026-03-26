"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";

type NavbarProps = {
  logoSrc?: string;
  appName?: string;
};

export function Navbar({
  logoSrc = "/Logo.png",
  appName = "WasGehtTueb",
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "mx-2 mt-2 rounded-2xl-plus border border-violet-200/50 glass-surface shadow-glass"
          : "bg-transparent",
      ].join(" ")}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-3 sm:px-4">
        <Link href="/" className="group inline-flex items-center gap-2.5">
          <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-violet-200/70 bg-white">
            <img
              src={logoSrc}
              alt="WasGehtTueb Logo"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </span>

          <span className="flex flex-col leading-none">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-500">
              Party Radar
            </span>
            <span className="text-sm font-semibold text-neutral-900 sm:text-base">{appName}</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-50"
            aria-label="Highlights"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Tonight</span>
          </button>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700 transition-colors hover:bg-violet-50"
            aria-label="Open menu"
          >
            <Menu size={16} />
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
