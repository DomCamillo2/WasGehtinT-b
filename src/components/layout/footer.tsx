'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-white mt-16 mb-20 md:mb-0">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">WG</span>
              </div>
              <span className="font-semibold text-neutral-900">WasGehtTüb</span>
            </div>
            <p className="text-sm text-neutral-600 max-w-sm">
              Deine Plattform für spontane Aktivitäten und Clubevents in Tüßlingen und Umgebung.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-neutral-900 mb-4 text-sm">Links</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/discover"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Entdecken
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Startseite
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-neutral-900 mb-4 text-sm">Rechtliches</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/impressum"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Impressum
                </Link>
              </li>
              <li>
                <Link
                  href="/datenschutz"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link
                  href="/nutzungsbedingungen"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  AGB
                </Link>
              </li>
              <li>
                <Link
                  href="/melden"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Melden
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-200 my-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-neutral-600">
            © {currentYear} Domile UG (haftungsbeschränkt). Alle Rechte vorbehalten.
          </p>
          <div className="flex items-center gap-1 text-xs text-neutral-600">
            Made with
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            for the community
          </div>
        </div>
      </div>
    </footer>
  );
}
