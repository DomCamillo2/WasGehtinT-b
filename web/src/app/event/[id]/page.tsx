import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock3, ExternalLink, MapPin, Tag } from "lucide-react";
import { DiscoverBottomNavV2 } from "@/components/discover/discover-bottom-nav-v2";
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
    },
    twitter: {
      card: "summary",
      title: seoTitle,
      description: event.seoDescription,
    },
  };
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 border-b border-[color:var(--border-soft)] py-3 last:border-b-0">
      <div className="mt-0.5 text-[color:var(--muted-foreground)]" aria-hidden>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
          {label}
        </p>
        <p className="mt-1 text-sm font-medium leading-snug text-[color:var(--foreground)] sm:text-base">
          {value}
        </p>
      </div>
    </div>
  );
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
    <AppShell theme="new" showBottomNav={false} mainClassName="space-y-6 pb-28">
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

      <div className="space-y-4">
        <Link
          href="/discover"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)]"
        >
          ← Zurück zu Entdecken
        </Link>

        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
            {event.kindLabel}
          </p>
          <h1 className="font-wordmark text-3xl leading-tight text-[color:var(--foreground)] sm:text-4xl">
            {event.title}
          </h1>
          <p className="text-base text-[color:var(--muted-foreground)]">
            {event.clubName} · {event.heroDateLabel}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {event.externalLink ? (
              <a
                href={event.externalLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[color:var(--accent)] px-4 text-sm font-semibold text-[color:var(--accent-dark-text)] transition-opacity hover:opacity-90"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Zum Veranstalter
              </a>
            ) : null}
            {event.mapsLink ? (
              <a
                href={event.mapsLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-elevated)] px-4 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:border-[color:var(--border-strong)]"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Auf Karte öffnen
              </a>
            ) : null}
          </div>
        </header>
      </div>

      <section aria-labelledby="event-details-heading">
        <h2 id="event-details-heading" className="font-wordmark text-lg text-[color:var(--foreground)]">
          Details
        </h2>
        <div className="mt-1">
          <DetailRow
            icon={<CalendarDays className="h-4 w-4" />}
            label="Start"
            value={event.startDateLabel}
          />
          <DetailRow
            icon={<Clock3 className="h-4 w-4" />}
            label="Ende"
            value={event.endDateLabel}
          />
          <DetailRow
            icon={<MapPin className="h-4 w-4" />}
            label="Ort"
            value={event.displayLocationName}
          />
          <DetailRow
            icon={<Tag className="h-4 w-4" />}
            label="Kategorie"
            value={event.displayCategory}
          />
          {event.priceInfo ? (
            <DetailRow icon={<Tag className="h-4 w-4" />} label="Preis" value={event.priceInfo} />
          ) : null}
        </div>
      </section>

      {event.description ? (
        <section aria-labelledby="event-desc-heading">
          <h2 id="event-desc-heading" className="font-wordmark text-lg text-[color:var(--foreground)]">
            Beschreibung
          </h2>
          <p className="mt-2 text-sm leading-7 text-[color:var(--foreground)]/90">
            {event.description}
          </p>
        </section>
      ) : null}

      <DiscoverBottomNavV2 activeTab="discover" />
    </AppShell>
  );
}
