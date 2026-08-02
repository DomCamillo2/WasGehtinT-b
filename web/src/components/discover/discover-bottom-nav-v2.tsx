"use client";

import { memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Compass, Zap } from "lucide-react";

export type DiscoverV2NavTab = "discover" | "saved" | "spontan";

type Props = {
  activeTab: DiscoverV2NavTab;
  onSelectDiscover?: () => void;
  onSelectSaved?: () => void;
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
        active ? "text-[color:var(--foreground)]" : "text-[color:var(--muted-foreground)]"
      }`}
    >
      {children}
    </span>
  );
}

function NavUnderline() {
  return (
    <span
      className="discover-nav-underline absolute inset-x-3 bottom-0 h-0.5 bg-[color:var(--accent)]"
      aria-hidden="true"
    />
  );
}

function DiscoverBottomNavV2Component({
  activeTab,
  onSelectDiscover,
  onSelectSaved,
}: Props) {
  const router = useRouter();
  const itemBase =
    "relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center px-1 py-2 sm:min-h-[56px] sm:min-w-[56px] sm:flex-none sm:px-3";

  const iconActive = "text-[color:var(--accent)]";
  const iconIdle = "text-[color:var(--muted-foreground)]";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:bottom-6 lg:flex lg:justify-center"
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto w-full max-w-md px-0 sm:px-3 lg:max-w-xl">
        <div
          className="flex w-full items-stretch justify-between border-t border-[color:var(--border-soft)] bg-[color:var(--nav-bg)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 sm:rounded-lg sm:border sm:px-2 sm:pb-1 lg:shadow-none"
          role="tablist"
        >
          <button
            type="button"
            onClick={() => {
              if (onSelectDiscover) {
                onSelectDiscover();
                return;
              }
              router.push("/discover");
            }}
            role="tab"
            aria-selected={activeTab === "discover"}
            aria-label="Events entdecken"
            className={`${itemBase} wg-pressable`}
          >
            <Compass
              className={`h-5 w-5 shrink-0 ${activeTab === "discover" ? iconActive : iconIdle}`}
              strokeWidth={activeTab === "discover" ? 2.25 : 1.75}
              aria-hidden="true"
            />
            <NavLabel active={activeTab === "discover"}>Entdecken</NavLabel>
            {activeTab === "discover" ? <NavUnderline /> : null}
          </button>

          <button
            type="button"
            onClick={() => {
              if (onSelectSaved) {
                onSelectSaved();
                return;
              }
              router.push("/discover?liked=1");
            }}
            role="tab"
            aria-selected={activeTab === "saved"}
            aria-label="Gemerkte Events"
            title="Gemerkt / Merkliste"
            className={`${itemBase} wg-pressable`}
          >
            <Bookmark
              className={`h-5 w-5 shrink-0 ${
                activeTab === "saved" ? `fill-[color:var(--accent)] ${iconActive}` : `fill-none ${iconIdle}`
              }`}
              strokeWidth={activeTab === "saved" ? 2.25 : 1.75}
              aria-hidden="true"
            />
            <NavLabel active={activeTab === "saved"}>Gemerkt</NavLabel>
            {activeTab === "saved" ? <NavUnderline /> : null}
          </button>

          <Link
            href="/spontan"
            className={`${itemBase} wg-pressable`}
            role="tab"
            aria-selected={activeTab === "spontan"}
            aria-label="Spontane Treffen"
          >
            <Zap
              className={`h-5 w-5 shrink-0 ${activeTab === "spontan" ? iconActive : iconIdle}`}
              strokeWidth={activeTab === "spontan" ? 2.25 : 1.75}
              aria-hidden="true"
            />
            <NavLabel active={activeTab === "spontan"}>Spontan</NavLabel>
            {activeTab === "spontan" ? <NavUnderline /> : null}
          </Link>
        </div>
      </div>
    </nav>
  );
}

export const DiscoverBottomNavV2 = memo(DiscoverBottomNavV2Component);
