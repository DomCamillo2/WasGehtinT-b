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
          className="inline-flex min-h-[38px] items-center rounded-full border border-[#2B2623] bg-[#1A1715]/90 px-4 py-2 text-xs font-semibold text-[#E9DFD6] transition-colors hover:border-[#3A312B] hover:text-white"
        >
          Zurück zu Discover
        </Link>

        <section className="overflow-hidden rounded-[1.2rem] border border-[#2B2623] bg-[radial-gradient(120%_120%_at_90%_10%,rgba(255,122,24,0.2),transparent_45%),linear-gradient(180deg,#171310_0%,#120f0d_100%)] px-5 py-6 shadow-[0_14px_40px_-28px_rgba(255,122,24,0.55)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A69A91]">
            {event.kindLabel}
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-[#F2ECE6]">
            {event.title}
          </h1>
          <p className="mt-3 text-base font-medium text-[#A69A91]">
            {event.clubName} · {event.heroDateLabel}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {event.externalLink ? (
              <a
                href={event.externalLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-[#ff7a18] px-4 py-2 text-sm font-semibold text-[#2D1D10] shadow-[0_10px_26px_-18px_rgba(255,122,24,0.95)] transition-opacity hover:opacity-90"
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
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#2B2623] bg-[#1A1715]/90 px-4 py-2 text-sm font-semibold text-[#E9DFD6] transition-colors hover:border-[#3A312B] hover:text-white"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Auf Karte öffnen
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <section className="grid gap-3 rounded-[1.1rem] border border-[#2B2623] bg-[#151210]/92 p-4 sm:p-5">
        <h2 className="text-lg font-bold text-[#F2ECE6]">
          Event-Details
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#2B2623] bg-[#1A1715]/88 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#A69A91]">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Start
            </p>
            <p className="mt-2 text-base font-semibold tabular-nums leading-snug text-[#E9DFD6] sm:text-lg">
              {event.startDateLabel}
            </p>
          </div>

          <div className="rounded-xl border border-[#2B2623] bg-[#1A1715]/88 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#A69A91]">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              Ende
            </p>
            <p className="mt-2 text-base font-semibold tabular-nums leading-snug text-[#E9DFD6] sm:text-lg">
              {event.endDateLabel}
            </p>
          </div>

          <div className="rounded-xl border border-[#2B2623] bg-[#1A1715]/88 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#A69A91]">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Ort
            </p>
            <p className="mt-2 text-sm font-medium text-[#E9DFD6]">
              {event.displayLocationName}
            </p>
          </div>

          <div className="rounded-xl border border-[#2B2623] bg-[#1A1715]/88 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#A69A91]">
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              Kategorie
            </p>
            <p className="mt-2 text-sm font-medium text-[#E9DFD6]">
              {event.displayCategory}
            </p>
          </div>
        </div>

        {event.priceInfo ? (
          <div className="rounded-xl border border-[#2B2623] bg-[#1A1715]/88 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A69A91]">
              Preis
            </p>
            <p className="mt-2 text-sm font-medium text-[#E9DFD6]">
              {event.priceInfo}
            </p>
          </div>
        ) : null}

        {event.description ? (
          <div className="rounded-xl border border-[#2B2623] bg-[#1A1715]/88 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A69A91]">
              Beschreibung
            </p>
            <p className="mt-2 text-sm leading-6 text-[#E9DFD6]">
              {event.description}
            </p>
          </div>
        ) : null}

        {event.coordinatesLabel ? (
          <div className="rounded-xl border border-[#2B2623] bg-[#1A1715]/88 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A69A91]">
              Koordinaten
            </p>
            <p className="mt-2 text-sm font-medium text-[#E9DFD6]">
              {event.coordinatesLabel}
            </p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
