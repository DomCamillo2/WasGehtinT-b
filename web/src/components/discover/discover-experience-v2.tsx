"use client";

import { Suspense } from "react";

import type { DiscoverFilterKey } from "@/lib/discover-filters";

import type { DiscoverViewMode } from "@/services/discover/discover-page-service";
import type { DiscoverEvent } from "@/services/discover/discover-view-model";

import { DiscoverFeedV2 } from "./discover-feed-v2";

type Props = {
  parties: DiscoverEvent[];
  avatarFallback: string;
  isAuthenticated: boolean;
  canLoadMore: boolean;
  currentWeeks: number;
  initialView: DiscoverViewMode;
  initialFilter: DiscoverFilterKey;
  initialCalendarDate?: string;
};

function DiscoverFeedFallback() {
  return (
    <div className="flex min-h-[32vh] flex-col items-center justify-center gap-3 px-4">
      <div
        className="h-8 w-8 rounded-full border-2 border-[#2a221d] border-t-[#ff7a18] animate-spin"
        aria-hidden="true"
      />
      <p className="text-xs font-medium text-[#8c8178]">Entdecken wird geladen …</p>
      <span className="sr-only">Discover-Feed wird geladen</span>
    </div>
  );
}

export function DiscoverExperienceV2(props: Props) {
  return (
    <div className="discover-ui-v2 relative min-h-screen bg-background overflow-x-hidden text-foreground">
      <div className="noise-overlay" aria-hidden="true" />
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden z-0 [contain:strict]"
        aria-hidden="true"
      >
        {/* Static blobs: infinite blur+transform animations cost composite work while scrolling */}
        <div className="absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full bg-primary/15 blur-[100px]" />
        <div className="absolute top-1/2 -left-48 h-[500px] w-[500px] rounded-full bg-secondary/10 blur-[88px]" />
        <div className="absolute bottom-32 right-1/3 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[72px]" />
      </div>
      <div className="relative z-10">
        <Suspense fallback={<DiscoverFeedFallback />}>
          <DiscoverFeedV2 key={props.currentWeeks} {...props} />
        </Suspense>
      </div>
    </div>
  );
}
