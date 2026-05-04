"use client";

import { Suspense } from "react";

import type { DiscoverFilterKey } from "@/lib/discover-filters";

import type { DiscoverEvent } from "@/services/discover/discover-view-model";

import { DiscoverFeedV2 } from "./discover-feed-v2";

type Props = {
  parties: DiscoverEvent[];
  avatarFallback: string;
  isAuthenticated: boolean;
  canLoadMore: boolean;
  currentWeeks: number;
  initialFilter: DiscoverFilterKey;
  initialCalendarDate?: string;
};

function DiscoverFeedFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Entdecken wird geladen …</p>
    </div>
  );
}

export function DiscoverExperienceV2(props: Props) {
  return (
    <div className="discover-ui-v2 relative min-h-screen bg-background overflow-x-hidden text-foreground">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-primary/15 blur-[180px] animate-float-1" />
        <div className="absolute top-1/2 -left-48 w-[500px] h-[500px] rounded-full bg-secondary/10 blur-[150px] animate-float-2" />
        <div className="absolute bottom-32 right-1/3 w-[400px] h-[400px] rounded-full bg-accent/10 blur-[120px] animate-float-3" />
      </div>
      <div className="relative z-10">
        <Suspense fallback={<DiscoverFeedFallback />}>
          <DiscoverFeedV2 key={props.currentWeeks} {...props} />
        </Suspense>
      </div>
    </div>
  );
}
