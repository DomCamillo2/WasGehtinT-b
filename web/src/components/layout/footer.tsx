'use client';

import Image from 'next/image';
import Link from 'next/link';
import { SITE_LOGO_SRC } from '@/lib/site-config';
import { Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="app-footer" className="relative mt-10 mb-18 md:mb-0 lg:mt-14">
      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10">
        <div
          aria-hidden="true"
          className="mb-5 h-px w-full sm:mb-6"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--border-soft) 80%, transparent), transparent)",
          }}
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.4fr_0.8fr_0.8fr] lg:gap-10">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <Image
                src={SITE_LOGO_SRC}
                alt="WasGehtTueb Logo"
                width={72}
                height={72}
                sizes="72px"
                className="h-16 w-16 object-contain"
                priority={false}
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
                  Mobile Nightlife Guide
                </p>
                <span className="font-semibold text-[color:var(--foreground)]">{"WasGehtT\u00fcb"}</span>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[color:var(--muted-foreground)] sm:leading-6">
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

        <div className="my-5 h-px sm:my-6" style={{ background: 'color-mix(in srgb, var(--border-soft) 65%, transparent)' }} />

        <div
          className="rounded-[22px] border p-4 shadow-[0_18px_48px_-32px_var(--shadow-color)] sm:rounded-[24px] sm:p-5"
          style={{
            borderColor: "color-mix(in srgb, var(--border-soft) 82%, transparent)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--surface-card) 72%, transparent), color-mix(in srgb, var(--surface-elevated) 62%, transparent))",
            backdropFilter: "blur(14px)",
          }}
        >
          <p className="text-sm font-semibold text-[color:var(--foreground)]">{"\u00dcber WasGehtT\u00fcb"}</p>
          <p className="mt-1.5 text-sm leading-6 text-[color:var(--muted-foreground)]">
            {"WasGehtT\u00fcb zeigt dir schnell, was heute in T\u00fcbingen los ist: Studentenpartys, Clubs, spontane Treffen und ausgew\u00e4hlte Events in einer mobilen \u00dcbersicht."}
          </p>
          <p className="mt-1.5 text-sm leading-6 text-[color:var(--muted-foreground)]">
            {"Besonders auf dem Handy soll alles direkt verst\u00e4ndlich sein: klare Filter, gute Lesbarkeit im Dark Mode und weniger unn\u00f6tige Ablenkung vor der Event-Liste."}
          </p>
        </div>

        <div className="mt-5 flex flex-col items-center justify-between gap-3 pb-2 sm:mt-6 md:flex-row">
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
