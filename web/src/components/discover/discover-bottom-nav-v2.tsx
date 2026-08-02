"use client";

import Link from "next/link";
import { Bookmark, Compass, User, Zap } from "lucide-react";

export type DiscoverV2NavTab = "discover" | "saved";

type Props = {
  activeTab: DiscoverV2NavTab;
  onSelectDiscover: () => void;
  onSelectSaved: () => void;
};

function NavLabel({
  active,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`mt-1 max-w-full truncate text-center text-[10px] font-medium leading-tight ${
        active ? "text-[#f0ebe4]" : "text-[#9a9086]"
      }`}
    >
      {children}
    </span>
  );
}

export function DiscoverBottomNavV2({
  activeTab,
  onSelectDiscover,
  onSelectSaved,
}: Props) {
  const itemBase =
    "relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center px-1 py-2 sm:min-h-[56px] sm:min-w-[56px] sm:flex-none sm:px-3";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:bottom-6 lg:flex lg:justify-center"
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto w-full max-w-md px-0 sm:px-3 lg:max-w-xl">
        <div
          className="flex w-full items-stretch justify-between border-t border-[rgba(240,235,228,0.12)] bg-[#14110f] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 sm:rounded-lg sm:border sm:px-2 sm:pb-1 lg:shadow-none"
          role="tablist"
        >
          <button
            type="button"
            onClick={onSelectDiscover}
            role="tab"
            aria-selected={activeTab === "discover"}
            aria-label="Events entdecken"
            className={itemBase}
          >
            <Compass
              className={`h-5 w-5 shrink-0 ${activeTab === "discover" ? "text-[#c4783a]" : "text-[#9a9086]"}`}
              strokeWidth={activeTab === "discover" ? 2.25 : 1.75}
              aria-hidden="true"
            />
            <NavLabel active={activeTab === "discover"}>Entdecken</NavLabel>
            {activeTab === "discover" ? (
              <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#c4783a]" aria-hidden="true" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={onSelectSaved}
            role="tab"
            aria-selected={activeTab === "saved"}
            aria-label="Gemerkte Events"
            title="Gemerkt / Merkliste"
            className={itemBase}
          >
            <Bookmark
              className={`h-5 w-5 shrink-0 ${
                activeTab === "saved" ? "fill-[#c4783a] text-[#c4783a]" : "fill-none text-[#9a9086]"
              }`}
              strokeWidth={activeTab === "saved" ? 2.25 : 1.75}
              aria-hidden="true"
            />
            <NavLabel active={activeTab === "saved"}>Gemerkt</NavLabel>
            {activeTab === "saved" ? (
              <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#c4783a]" aria-hidden="true" />
            ) : null}
          </button>

          <Link href="/spontan" className={`${itemBase} text-[#9a9086]`} aria-label="Spontane Events">
            <Zap className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <NavLabel>Spontan</NavLabel>
          </Link>

          <button
            type="button"
            disabled
            title="Profil kommt bald"
            className={`${itemBase} cursor-not-allowed opacity-55`}
            aria-label="Profil (kommt bald)"
            aria-disabled="true"
          >
            <User className="h-5 w-5 shrink-0 text-[#9a9086]" strokeWidth={1.75} aria-hidden="true" />
            <NavLabel>Profil</NavLabel>
          </button>
        </div>
      </div>
    </nav>
  );
}
