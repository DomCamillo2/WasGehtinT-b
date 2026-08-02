import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock3, ExternalLink, MapPin, Tag } from "lucide-react";
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
    <AppShell theme="new" mainClassName="space-y-4">
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

      <div className="space-y-3">
        <Link
          href="/discover"
          className="inline-flex min-h-[38px] items-center rounded-md border border-[rgba(240,235,228,0.12)] bg-[#1c1815] px-4 py-2 text-xs font-semibold text-[#f0ebe4] transition-colors hover:border-[rgba(240,235,228,0.22)]"
        >
          Zurück zu Discover
        </Link>

        <section className="overflow-hidden rounded-lg border border-[rgba(240,235,228,0.12)] bg-[#1c1815] px-5 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a9086]">
            {event.kindLabel}
          </p>
          <h1 className="mt-3 font-wordmark text-3xl leading-tight text-[#f0ebe4]">
            {event.title}
          </h1>
          <p className="mt-3 text-base font-medium text-[#9a9086]">
            {event.clubName} · {event.heroDateLabel}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {event.externalLink ? (
              <a
                href={event.externalLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md bg-[#c4783a] px-4 py-2 text-sm font-semibold text-[#1c1410] transition-opacity hover:opacity-90"
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
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-[rgba(240,235,228,0.12)] bg-[#221e1a] px-4 py-2 text-sm font-semibold text-[#f0ebe4] transition-colors hover:border-[rgba(240,235,228,0.22)]"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Auf Karte öffnen
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <section className="grid gap-3 rounded-lg border border-[rgba(240,235,228,0.12)] bg-[#1c1815] p-4 sm:p-5">
        <h2 className="font-wordmark text-lg text-[#f0ebe4]">
          Event-Details
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-[rgba(240,235,228,0.12)] bg-[#221e1a] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#9a9086]">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Start
            </p>
            <p className="mt-2 text-base font-semibold tabular-nums leading-snug text-[#f0ebe4] sm:text-lg">
              {event.startDateLabel}
            </p>
          </div>

          <div className="rounded-md border border-[rgba(240,235,228,0.12)] bg-[#221e1a] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#9a9086]">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              Ende
            </p>
            <p className="mt-2 text-base font-semibold tabular-nums leading-snug text-[#f0ebe4] sm:text-lg">
              {event.endDateLabel}
            </p>
          </div>

          <div className="rounded-md border border-[rgba(240,235,228,0.12)] bg-[#221e1a] p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#9a9086]">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Ort
            </p>
            <p className="mt-2 text-sm font-medium text-[#f0ebe4]">
              {event.displayLocationName}
            </p>
          </div>

          <div className="rounded-md border border-[rgba(240,235,228,0.12)] bg-[#221e1a] p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#9a9086]">
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              Kategorie
            </p>
            <p className="mt-2 text-sm font-medium text-[#f0ebe4]">
              {event.displayCategory}
            </p>
          </div>
        </div>

        {event.priceInfo ? (
          <div className="rounded-md border border-[rgba(240,235,228,0.12)] bg-[#221e1a] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a9086]">
              Preis
            </p>
            <p className="mt-2 text-sm font-medium text-[#f0ebe4]">
              {event.priceInfo}
            </p>
          </div>
        ) : null}

        {event.description ? (
          <div className="rounded-md border border-[rgba(240,235,228,0.12)] bg-[#221e1a] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a9086]">
              Beschreibung
            </p>
            <p className="mt-2 text-sm leading-6 text-[#f0ebe4]">
              {event.description}
            </p>
          </div>
        ) : null}

        {event.coordinatesLabel ? (
          <div className="rounded-md border border-[rgba(240,235,228,0.12)] bg-[#221e1a] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a9086]">
              Koordinaten
            </p>
            <p className="mt-2 text-sm font-medium text-[#f0ebe4]">
              {event.coordinatesLabel}
            </p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
