'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="app-footer" className="relative mt-18 mb-24 md:mb-0">
      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="mb-8 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--border-soft) 80%, transparent), transparent)",
          }}
        />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-400 shadow-[0_14px_30px_-18px_var(--shadow-color)]">
                <span className="text-sm font-bold text-white">WG</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                  Mobile Nightlife Guide
                </p>
                <span className="font-semibold text-[color:var(--foreground)]">{"WasGehtT\u00fcb"}</span>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[color:var(--muted-foreground)]">
              {"Deine Plattform f\u00fcr spontane Aktivit\u00e4ten, Studentenpartys und Clubevents in T\u00fcbingen."}
            </p>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-[color:var(--foreground)]">Links</p>
            <ul className="space-y-3">
              <li>
                <Link href="/discover" className="text-sm transition-colors hover:text-[color:var(--foreground)]" style={{ color: 'var(--muted-foreground)' }}>
                  Entdecken
                </Link>
              </li>
              <li>
                <Link href="/" className="text-sm transition-colors hover:text-[color:var(--foreground)]" style={{ color: 'var(--muted-foreground)' }}>
                  Startseite
                </Link>
              </li>
              <li>
                <Link href="/feedback" className="text-sm transition-colors hover:text-[color:var(--foreground)]" style={{ color: 'var(--muted-foreground)' }}>
                  Feedback
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-[color:var(--foreground)]">Rechtliches</p>
            <ul className="space-y-3">
              <li>
                <Link href="/impressum" className="text-sm transition-colors hover:text-[color:var(--foreground)]" style={{ color: 'var(--muted-foreground)' }}>
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="text-sm transition-colors hover:text-[color:var(--foreground)]" style={{ color: 'var(--muted-foreground)' }}>
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link href="/nutzungsbedingungen" className="text-sm transition-colors hover:text-[color:var(--foreground)]" style={{ color: 'var(--muted-foreground)' }}>
                  AGB
                </Link>
              </li>
              <li>
                <Link href="/melden" className="text-sm transition-colors hover:text-[color:var(--foreground)]" style={{ color: 'var(--muted-foreground)' }}>
                  Melden
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="my-8 h-px" style={{ background: 'color-mix(in srgb, var(--border-soft) 65%, transparent)' }} />

        <div
          className="rounded-[28px] border p-5 shadow-[0_18px_48px_-32px_var(--shadow-color)]"
          style={{
            borderColor: "color-mix(in srgb, var(--border-soft) 82%, transparent)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--surface-card) 72%, transparent), color-mix(in srgb, var(--surface-elevated) 62%, transparent))",
            backdropFilter: "blur(14px)",
          }}
        >
          <p className="text-sm font-semibold text-[color:var(--foreground)]">{"\u00dcber WasGehtT\u00fcb"}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
            {"WasGehtT\u00fcb zeigt dir schnell, was heute in T\u00fcbingen los ist: Studentenpartys, Clubs, spontane Treffen und ausgew\u00e4hlte Events in einer mobilen \u00dcbersicht."}
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
            {"Besonders auf dem Handy soll alles direkt verst\u00e4ndlich sein: klare Filter, gute Lesbarkeit im Dark Mode und weniger unn\u00f6tige Ablenkung vor der Event-Liste."}
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 pb-4 md:flex-row">
          <p className="text-xs text-[color:var(--muted-foreground)]">
            {"\u00a9"} {currentYear} {"Domile UG (haftungsbeschr\u00e4nkt). Alle Rechte vorbehalten."}
          </p>
          <div className="flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
            <span>Made with</span>
            <Heart className="h-3 w-3 fill-red-500 text-red-500" />
            <span>for the community</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
