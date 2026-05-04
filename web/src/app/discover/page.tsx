import type { Metadata } from "next";
import { DiscoverExperienceV2 } from "@/components/discover/discover-experience-v2";
import { AppShell } from "@/components/layout/app-shell";
import { DiscoverPremium } from "@/components/party/discover-premium";
import { DiscoverSchema } from "@/components/seo/discover-schema";
import { SITE_NAME, absoluteUrl } from "@/lib/site-config";
import { loadDiscoverPageData } from "@/services/discover/discover-page-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Was geht in Tuebingen heute? Clubs, Studentenpartys und Events",
  description:
    "Clubs, Studentenpartys, Community-Treffen und Tagesevents in Tuebingen - gesammelt an einem Ort. Mit Uhrzeiten, Karten, Detailseiten und Links zu Veranstaltern.",
  keywords: [
    "Was geht in Tuebingen heute",
    "Tuebingen Events",
    "Tuebingen Partys",
    "Studentenpartys Tuebingen",
    "Clubs Tuebingen",
    "Events dieses Wochenende Tuebingen",
  ],
  alternates: {
    canonical: "/discover",
  },
  openGraph: {
    title: "Was geht in Tuebingen heute? Clubs, Studentenpartys und Events",
    description:
      "Alle wichtigen Events in Tuebingen an einem Ort: Clubs, Studentenpartys, Community-Treffen und Tagesevents.",
    url: absoluteUrl("/discover"),
    type: "website",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: "Was geht in Tuebingen heute? Clubs, Studentenpartys und Events",
    description:
      "Alle wichtigen Events in Tuebingen an einem Ort: Clubs, Studentenpartys, Community-Treffen und Tagesevents.",
  },
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    date?: string;
    type?: string;
    weeks?: string;
    liked?: string;
    ui?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const isUiNew = resolvedSearchParams.ui === "new";
  const {
    parties,
    avatarFallback,
    isAuthenticated,
    canLoadMore,
    currentWeeks,
    initialView,
    initialFilter,
    initialCalendarDate,
  } = await loadDiscoverPageData(
    resolvedSearchParams,
  );

  return (
    <AppShell
      shellClassName="overflow-visible"
      showFooter={!isUiNew}
      showBottomNav={!isUiNew}
      mainFlush={isUiNew}
    >
      <DiscoverSchema events={parties} />
      {isUiNew ? (
        <DiscoverExperienceV2
          parties={parties}
          avatarFallback={avatarFallback}
          isAuthenticated={isAuthenticated}
          canLoadMore={canLoadMore}
          currentWeeks={currentWeeks}
          initialFilter={initialFilter}
          initialCalendarDate={initialCalendarDate}
        />
      ) : (
        <DiscoverPremium
          parties={parties}
          avatarFallback={avatarFallback}
          isAuthenticated={isAuthenticated}
          canLoadMore={canLoadMore}
          currentWeeks={currentWeeks}
          initialView={initialView}
          initialFilter={initialFilter}
          initialCalendarDate={initialCalendarDate}
        />
      )}
    </AppShell>
  );
}
