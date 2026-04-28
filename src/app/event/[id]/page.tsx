import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    <AppShell mainClassName="space-y-5">
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
          className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold"
          style={{
            borderColor: "var(--nav-border)",
            backgroundColor: "var(--surface-elevated)",
            color: "var(--foreground)",
          }}
        >
          Zurueck zu Discover
        </Link>

        <section
          className="rounded-[2rem] border px-5 py-6 shadow-[0_10px_30px_rgba(20,24,40,0.08)]"
          style={{
            borderColor: "var(--nav-border)",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--surface-elevated) 78%, #f59e0b 22%), var(--surface-elevated))",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            {event.kindLabel}
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight" style={{ color: "var(--foreground)" }}>
            {event.title}
          </h1>
          <p className="mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
            {event.clubName} · {event.heroDateLabel}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {event.externalLink ? (
              <a
                href={event.externalLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Zum Veranstalter
              </a>
            ) : null}
            {event.mapsLink ? (
              <a
                href={event.mapsLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold"
                style={{
                  borderColor: "var(--nav-border)",
                  backgroundColor: "var(--surface-elevated)",
                  color: "var(--foreground)",
                }}
              >
                Auf Karte oeffnen
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <section
        className="grid gap-3 rounded-[1.75rem] border p-5"
        style={{
          borderColor: "var(--nav-border)",
          backgroundColor: "var(--surface-elevated)",
        }}
      >
        <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
          Event-Details
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface-soft)" }}>
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Start
            </p>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
              {event.startDateLabel}
            </p>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface-soft)" }}>
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Ende
            </p>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
              {event.endDateLabel}
            </p>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface-soft)" }}>
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Ort
            </p>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
              {event.displayLocationName}
            </p>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface-soft)" }}>
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Kategorie
            </p>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
              {event.displayCategory}
            </p>
          </div>
        </div>

        {event.priceInfo ? (
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface-soft)" }}>
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Preis
            </p>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
              {event.priceInfo}
            </p>
          </div>
        ) : null}

        {event.description ? (
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface-soft)" }}>
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Beschreibung
            </p>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--foreground)" }}>
              {event.description}
            </p>
          </div>
        ) : null}

        {event.coordinatesLabel ? (
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface-soft)" }}>
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Koordinaten
            </p>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
              {event.coordinatesLabel}
            </p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
