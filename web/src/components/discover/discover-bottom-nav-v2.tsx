"use client";

import Link from "next/link";
import { Compass, Map, User, Zap } from "lucide-react";

export type DiscoverV2NavTab = "discover" | "map";

type Props = {
  activeTab: DiscoverV2NavTab;
  onSelectDiscover: () => void;
  onSelectMap: () => void;
};

export function DiscoverBottomNavV2({
  activeTab,
  onSelectDiscover,
  onSelectMap,
}: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none" aria-label="Hauptnavigation">
      <div className="mx-4 mb-4 sm:mx-auto sm:max-w-md pointer-events-auto">
        <div
          className="flex items-center justify-around px-2 py-1 rounded-2xl border backdrop-blur-2xl bg-[#17120f]/94 border-[#2a221d] shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
          role="tablist"
        >
          <button
            type="button"
            onClick={onSelectDiscover}
            role="tab"
            aria-selected={activeTab === "discover"}
            aria-label="Events entdecken"
            className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-3 py-2 rounded-xl transition-all duration-200 ${
              activeTab === "discover" ? "bg-[#ff7a18] text-[#2d1d10] shadow-[0_8px_24px_rgba(255,122,24,0.35)]" : "hover:bg-[#1d1713] active:bg-[#241d19]"
            }`}
          >
            <Compass
              className={`w-5 h-5 ${activeTab === "discover" ? "text-[#2d1d10]" : "text-[#a89b90]"}`}
              strokeWidth={activeTab === "discover" ? 2.5 : 2}
              aria-hidden="true"
            />
            <span
              className={`text-[10px] font-medium mt-1 ${
                activeTab === "discover" ? "text-[#2d1d10]" : "text-[#a89b90]"
              }`}
            >
              Entdecken
            </span>
            {activeTab === "discover" ? (
              <span
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#2d1d10]"
                aria-hidden="true"
              />
            ) : null}
          </button>

          <button
            type="button"
            onClick={onSelectMap}
            role="tab"
            aria-selected={activeTab === "map"}
            aria-label="Karte anzeigen"
            className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-3 py-2 rounded-xl transition-all duration-200 ${
              activeTab === "map" ? "bg-[#ff7a18] text-[#2d1d10] shadow-[0_8px_24px_rgba(255,122,24,0.35)]" : "hover:bg-[#1d1713] active:bg-[#241d19]"
            }`}
          >
            <Map
              className={`w-5 h-5 ${activeTab === "map" ? "text-[#2d1d10]" : "text-[#a89b90]"}`}
              strokeWidth={activeTab === "map" ? 2.5 : 2}
              aria-hidden="true"
            />
            <span
              className={`text-[10px] font-medium mt-1 ${
                activeTab === "map" ? "text-[#2d1d10]" : "text-[#a89b90]"
              }`}
            >
              Karte
            </span>
            {activeTab === "map" ? (
              <span
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#2d1d10]"
                aria-hidden="true"
              />
            ) : null}
          </button>

          <Link
            href="/spontan"
            className="relative flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-3 py-2 rounded-xl transition-all duration-200 hover:bg-[#1d1713] active:bg-[#241d19] text-[#a89b90]"
            aria-label="Spontane Events"
          >
            <Zap className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
            <span className="text-[10px] font-medium mt-1">Spontan</span>
          </Link>

          <button
            type="button"
            disabled
            title="Profil kommt bald"
            className="relative flex cursor-not-allowed flex-col items-center justify-center min-w-[64px] min-h-[56px] px-3 py-2 rounded-xl text-[#6f655d] opacity-70"
            aria-label="Profil (kommt bald)"
            aria-disabled="true"
          >
            <User className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
            <span className="text-[10px] font-medium mt-1">Profil</span>
            <span className="mt-0.5 rounded-full border border-[#3a312b] bg-[#1a1715] px-1.5 py-0.5 text-[9px] leading-none text-[#8c8178]">
              Coming soon
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
