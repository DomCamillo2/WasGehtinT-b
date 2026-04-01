'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 mb-20 border-t border-neutral-200 bg-white md:mb-0">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <span className="text-sm font-bold text-white">WG</span>
              </div>
              <span className="font-semibold text-neutral-900">WasGehtTüb</span>
            </div>
            <p className="max-w-sm text-sm text-neutral-600">
              Deine Plattform für spontane Aktivitäten, Studentenpartys und Clubevents in Tübingen.
            </p>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-neutral-900">Links</p>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/discover"
                  className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  Entdecken
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  Startseite
                </Link>
              </li>
              <li>
                <Link
                  href="/feedback"
                  className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  Feedback
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-neutral-900">Rechtliches</p>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/impressum"
                  className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  Impressum
                </Link>
              </li>
              <li>
                <Link
                  href="/datenschutz"
                  className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link
                  href="/nutzungsbedingungen"
                  className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  AGB
                </Link>
              </li>
              <li>
                <Link
                  href="/melden"
                  className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  Melden
                </Link>
              </li>
              <li>
                <Link
                  href="/feedback"
                  className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  Feature Request
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="my-8 border-t border-neutral-200" />

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
          <p className="text-sm font-semibold text-neutral-900">Über WasGehtTüb</p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            WasGehtTüb ist dein kompakter Guide fürs Nachtleben Tübingen, wenn du schnell sehen willst,
            wo Studentenpartys, Clubs und spontane Events laufen. Viele suchen nach Party heute Tübingen,
            nach dem nächsten Clubhaus-Abend oder nach Wohngemeinschaftspartys, die wirklich zu ihrem
            Abend passen. Genau dafür sammelt WasGehtTüb aktuelle Hinweise zu Studentenpartys,
            Club-Events und spontanen Treffen in einer mobilen Übersicht. Ob Clubhaus, Kuckuck,
            Schlachthaus oder kleinere Partys in Tübingen: Du bekommst schneller ein Gefühl dafür,
            was heute los ist und was sich am Wochenende lohnt. Gerade für neue Studierende ist das
            Nachtleben Tübingen oft schwer zu überblicken, weil sich Studentenpartys, Clubhaus-Abende,
            Kuckuck-Nächte und Schlachthaus-Events auf viele Kanäle verteilen. Mit WasGehtTüb findest
            du Party heute Tübingen, Clubs, Wohngemeinschaftspartys und andere Tipps für das
            Nachtleben Tübingen an einem Ort.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-xs text-neutral-600">
            © {currentYear} Domile UG (haftungsbeschränkt). Alle Rechte vorbehalten.
          </p>
          <div className="flex items-center gap-1 text-xs text-neutral-600">
            Made with
            <Heart className="h-3 w-3 fill-red-500 text-red-500" />
            for the community
          </div>
        </div>
      </div>
    </footer>
  );
}
