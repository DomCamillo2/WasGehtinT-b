"use client";

import Link from "next/link";
import { Bookmark, Compass, User, Zap } from "lucide-react";

export type DiscoverV2NavTab = "discover" | "saved";

type Props = {
  activeTab: DiscoverV2NavTab;
  onSelectDiscover: () => void;
  onSelectSaved: () => void;
};

export function DiscoverBottomNavV2({
  activeTab,
  onSelectDiscover,
  onSelectSaved,
}: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none lg:bottom-6 lg:flex lg:justify-center lg:pb-6"
      aria-label="Hauptnavigation"
    >
      <div className="box-border w-full max-w-[min(100%,28rem)] px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-auto sm:mx-auto sm:max-w-md lg:max-w-xl lg:mx-auto lg:mb-0 lg:pb-6 lg:shadow-[0_12px_40px_rgba(0,0,0,0.45)] lg:rounded-2xl lg:overflow-hidden">
        <div
          className="flex w-full min-w-0 items-stretch justify-between gap-0.5 rounded-2xl border border-[#2a221d]/75 bg-[#17120f]/65 px-1 py-1 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md backdrop-saturate-150 sm:justify-around sm:gap-0 sm:px-2"
          role="tablist"
        >
          <button
            type="button"
            onClick={onSelectDiscover}
            role="tab"
            aria-selected={activeTab === "discover"}
            aria-label="Events entdecken"
            className={`relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center px-1 py-1.5 rounded-xl transition-all duration-200 sm:min-h-[56px] sm:min-w-[56px] sm:flex-none sm:px-3 sm:py-2 ${
              activeTab === "discover" ? "bg-[#ff7a18] text-[#2d1d10] shadow-[0_8px_24px_rgba(255,122,24,0.35)]" : "hover:bg-[#1d1713] active:bg-[#241d19]"
            }`}
          >
            <Compass
              className={`h-5 w-5 shrink-0 ${activeTab === "discover" ? "text-[#2d1d10]" : "text-[#a89b90]"}`}
              strokeWidth={activeTab === "discover" ? 2.5 : 2}
              aria-hidden="true"
            />
            <span
              className={`mt-0.5 max-w-full truncate text-center text-[9px] font-medium leading-tight sm:mt-1 sm:text-[10px] ${
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
            onClick={onSelectSaved}
            role="tab"
            aria-selected={activeTab === "saved"}
            aria-label="Gemerkte Events"
            title="Gemerkt / Merkliste"
            className={`relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center px-1 py-1.5 rounded-xl transition-all duration-200 sm:min-h-[56px] sm:min-w-[56px] sm:flex-none sm:px-3 sm:py-2 ${
              activeTab === "saved" ? "bg-[#ff7a18] text-[#2d1d10] shadow-[0_8px_24px_rgba(255,122,24,0.35)]" : "hover:bg-[#1d1713] active:bg-[#241d19]"
            }`}
          >
            <Bookmark
              className={`h-5 w-5 shrink-0 ${activeTab === "saved" ? "fill-[#2d1d10] text-[#2d1d10]" : "fill-none text-[#a89b90]"}`}
              strokeWidth={activeTab === "saved" ? 2.5 : 2}
              aria-hidden="true"
            />
            <span
              className={`mt-0.5 max-w-full truncate text-center text-[9px] font-medium leading-tight sm:mt-1 sm:text-[10px] ${
                activeTab === "saved" ? "text-[#2d1d10]" : "text-[#a89b90]"
              }`}
            >
              Gemerkt
            </span>
            {activeTab === "saved" ? (
              <span
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#2d1d10]"
                aria-hidden="true"
              />
            ) : null}
          </button>

          <Link
            href="/spontan"
            className="relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center px-1 py-1.5 rounded-xl transition-all duration-200 hover:bg-[#1d1713] active:bg-[#241d19] text-[#a89b90] sm:min-h-[56px] sm:min-w-[56px] sm:flex-none sm:px-3 sm:py-2"
            aria-label="Spontane Events"
          >
            <Zap className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="mt-0.5 max-w-full truncate text-center text-[9px] font-medium leading-tight sm:mt-1 sm:text-[10px]">
              Spontan
            </span>
          </Link>

          <button
            type="button"
            disabled
            title="Profil kommt bald"
            className="relative flex min-h-[52px] min-w-0 flex-1 cursor-not-allowed flex-col items-center justify-center px-1 py-1.5 rounded-xl text-[#6f655d] opacity-70 sm:min-h-[56px] sm:min-w-[56px] sm:flex-none sm:px-3 sm:py-2"
            aria-label="Profil (kommt bald)"
            aria-disabled="true"
          >
            <User className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="mt-0.5 max-w-full truncate text-center text-[9px] font-medium leading-tight sm:mt-1 sm:text-[10px]">
              Profil
            </span>
            <span className="mt-0.5 max-w-[min(100%,5rem)] truncate rounded-full border border-[#3a312b] bg-[#1a1715] px-1 py-0.5 text-[8px] leading-tight text-[#8c8178] sm:max-w-none sm:px-1.5 sm:text-[9px]">
              <span className="sm:hidden">Bald</span>
              <span className="hidden sm:inline">Coming soon</span>
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
