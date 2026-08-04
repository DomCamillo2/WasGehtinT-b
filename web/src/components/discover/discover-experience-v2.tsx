"use client";

import { Suspense } from "react";

import type { DiscoverFilterKey } from "@/lib/discover-filters";

import type { DiscoverViewMode } from "@/services/discover/discover-page-service";
import type { DiscoverEvent } from "@/services/discover/discover-view-model";

import { DiscoverFeedSkeleton } from "./discover-feed-skeleton";
import { DiscoverFeedV2 } from "./discover-feed-v2";
import { DiscoverMotionRoot } from "@/lib/discover-motion";

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
    <DiscoverMotionRoot>
      <div className="discover-ui-v2 relative min-h-screen bg-background text-foreground">
        <div className="relative z-10">
          <Suspense fallback={<DiscoverFeedSkeleton />}>
            {/* Do not key on weeks — remounting resets scroll, visibleCount, and heroes (laggy “load more”). */}
            <DiscoverFeedV2 {...props} />
          </Suspense>
        </div>
      </div>
    </DiscoverMotionRoot>
  );
}
