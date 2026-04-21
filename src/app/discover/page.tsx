import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { DiscoverPremium } from "@/components/party/discover-premium";
import { loadDiscoverPageData } from "@/services/discover/discover-page-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Was geht in Tübingen heute? Partys, Clubs und Events",
  description:
    "Finde heraus, was in Tübingen heute geht: Studentenpartys, Clubs, Community-Treffen und ausgewählte Tagesevents in einer mobilen Übersicht.",
  alternates: {
    canonical: "/discover",
  },
  openGraph: {
    title: "Was geht in Tübingen heute? Partys, Clubs und Events",
    description:
      "Alle wichtigen Partys, Clubs und Events in Tübingen heute auf einen Blick.",
    url: "/discover",
    type: "website",
  },
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; type?: string; weeks?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const { parties, avatarFallback, isAuthenticated, canLoadMore, loadMoreHref } = await loadDiscoverPageData(
    resolvedSearchParams,
  );

  return (
    <AppShell shellClassName="overflow-visible">
      <DiscoverPremium
        parties={parties}
        avatarFallback={avatarFallback}
        isAuthenticated={isAuthenticated}
        canLoadMore={canLoadMore}
        loadMoreHref={loadMoreHref}
      />
    </AppShell>
  );
}
