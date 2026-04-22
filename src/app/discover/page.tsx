import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { DiscoverPremium } from "@/components/party/discover-premium";
import { DiscoverSchema } from "@/components/seo/discover-schema";
import { SITE_NAME, absoluteUrl } from "@/lib/site-config";
import { loadDiscoverPageData } from "@/services/discover/discover-page-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Was geht in Tuebingen heute? Partys, Clubs und Events",
  description:
    "Finde aktuelle Studentenpartys, Clubs, Community-Treffen und Tagesevents in Tuebingen. Mit Uhrzeiten, Orten, Kartenpunkten und Links zu Veranstaltern.",
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
    title: "Was geht in Tuebingen heute? Partys, Clubs und Events",
    description:
      "Alle wichtigen Partys, Clubs, Community-Treffen und Tagesevents in Tuebingen auf einen Blick.",
    url: absoluteUrl("/discover"),
    type: "website",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: "Was geht in Tuebingen heute? Partys, Clubs und Events",
    description:
      "Alle wichtigen Partys, Clubs, Community-Treffen und Tagesevents in Tuebingen auf einen Blick.",
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
      <DiscoverSchema events={parties} />
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
