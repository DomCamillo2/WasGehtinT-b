import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { EventSchema } from "@/components/seo/event-schema";
import { getExternalEventById } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

const SITE_URL = "https://wasgehttueb.app";

function formatFullDateTime(input: string) {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return "Datum offen";
  }

  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "full",
    timeStyle: "short",
  }).format(parsed);
}

function formatCoordinates(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) {
    return null;
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function truncateDescription(text: string, maxLength = 150) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getExternalEventById(id);

  if (!event) {
    return {
      title: "Event nicht gefunden | WasGehtTüb",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const clubName = event.location_name?.trim() || event.vibe_label.trim() || "Tübingen";
  const description = event.description?.trim()
    ? truncateDescription(event.description)
    : truncateDescription(`${event.title} im ${clubName} am ${formatDateTime(event.starts_at)}.`);
  const canonicalUrl = `${SITE_URL}/event/${event.id}`;
  const seoTitle = `${event.title} im ${clubName} | WasGehtTüb`;

  return {
    title: seoTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: seoTitle,
      description,
      url: canonicalUrl,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: seoTitle,
      description,
    },
  };
}

export default async function ExternalEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getExternalEventById(id);

  if (!event) {
    notFound();
  }

  const clubName = event.location_name?.trim() || event.vibe_label.trim() || "Tübingen";
  const mapsLink =
    event.public_lat != null && event.public_lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${event.public_lat},${event.public_lng}`
      : null;
  const schemaDescription =
    event.description?.trim() ||
    `${event.title} im ${clubName} am ${formatDateTime(event.starts_at)} in Tübingen.`;

  return (
    <AppShell mainClassName="space-y-5">
      <EventSchema
        name={event.title}
        startDate={event.starts_at}
        endDate={event.ends_at}
        location={clubName}
        description={schemaDescription}
        url={`${SITE_URL}/event/${event.id}`}
        organizerName={clubName}
        externalLink={event.external_link}
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
          Zurück zu Discover
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
            Externes Event
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight" style={{ color: "var(--foreground)" }}>
            {event.title}
          </h1>
          <p className="mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
            {clubName} · {formatDateTime(event.starts_at)} Uhr
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {event.external_link ? (
              <a
                href={event.external_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Zum Veranstalter
              </a>
            ) : null}
            {mapsLink ? (
              <a
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold"
                style={{
                  borderColor: "var(--nav-border)",
                  backgroundColor: "var(--surface-elevated)",
                  color: "var(--foreground)",
                }}
              >
                Auf Karte öffnen
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
              {formatFullDateTime(event.starts_at)}
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
              {formatFullDateTime(event.ends_at)}
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
              {event.location_name ?? "Ort wird noch ergänzt"}
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
              {event.music_genre ?? event.vibe_label}
            </p>
          </div>
        </div>

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

        {formatCoordinates(event.public_lat, event.public_lng) ? (
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface-soft)" }}>
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Koordinaten
            </p>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
              {formatCoordinates(event.public_lat, event.public_lng)}
            </p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
