"use client";

import { Suspense } from "react";

import type { DiscoverFilterKey } from "@/lib/discover-filters";

import type { DiscoverViewMode } from "@/services/discover/discover-page-service";
import type { DiscoverEvent } from "@/services/discover/discover-view-model";

import { DiscoverFeedSkeleton } from "./discover-feed-skeleton";
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

export function DiscoverExperienceV2(props: Props) {
  return (
    <div className="discover-ui-v2 relative min-h-screen bg-background text-foreground">
      <div className="relative z-10">
        <Suspense fallback={<DiscoverFeedSkeleton />}>
          <DiscoverFeedV2 key={props.currentWeeks} {...props} />
        </Suspense>
      </div>
    </div>
  );
}
