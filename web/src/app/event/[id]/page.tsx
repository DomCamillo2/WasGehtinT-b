import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiscoverBottomNavV2 } from "@/components/discover/discover-bottom-nav-v2";
import { EventDetailView } from "@/components/events/event-detail-view";
import { AppShell } from "@/components/layout/app-shell";
import { EventSchema } from "@/components/seo/event-schema";
import { SITE_NAME, absoluteUrl } from "@/lib/site-config";
import { loadExternalEventPageData } from "@/services/events/external-event-page-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await loadExternalEventPageData(id);

  if (!event) {
    return {
      title: "Event nicht gefunden | WasGehtTueb",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalUrl = absoluteUrl(`/event/${event.id}`);
  const seoTitle = `${event.title} im ${event.clubName} | ${SITE_NAME}`;

  return {
    title: seoTitle,
    description: event.seoDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: seoTitle,
      description: event.seoDescription,
      url: canonicalUrl,
      type: "article",
      ...(event.heroImageUrl ? { images: [{ url: event.heroImageUrl }] } : {}),
    },
    twitter: {
      card: event.heroImageUrl ? "summary_large_image" : "summary",
      title: seoTitle,
      description: event.seoDescription,
    },
  };
}

export default async function ExternalEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await loadExternalEventPageData(id);

  if (!event) {
    notFound();
  }

  return (
    <AppShell theme="new" showBottomNav={false} mainClassName="pb-28">
      <EventSchema
        name={event.title}
        startDate={event.startsAt}
        endDate={event.endsAt}
        location={event.clubName}
        description={event.schemaDescription}
        url={absoluteUrl(`/event/${event.id}`)}
        organizerName={event.sourceBadge?.trim() || event.clubName}
        externalLink={event.externalLink}
        priceInfo={event.priceInfo}
        musicGenre={event.musicGenre}
      />

      <EventDetailView event={event} />
      <DiscoverBottomNavV2 activeTab="discover" />
    </AppShell>
  );
}
