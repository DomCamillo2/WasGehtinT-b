import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { formatDateTime } from "@/lib/format";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site-config";
import { getVenueDefinition, listVenueSlugs } from "@/lib/venues-catalog";
import { loadVenuePageData } from "@/services/venues/venue-page-service";

export const revalidate = 1800;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listVenueSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const venue = getVenueDefinition(slug);
  if (!venue) {
    return { title: `Location | ${SITE_NAME}` };
  }

  const title = `${venue.seoName} – Programm & kommende Termine | ${SITE_NAME}`;
  const description = venue.metaDescription;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/venues/${venue.slug}`),
    },
    keywords: [
      `${venue.shortName} Tübingen Termine`,
      `${venue.shortName} Tübingen Programm`,
      "Events Tübingen",
      "Partys Tübingen",
    ],
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/venues/${venue.slug}`),
      type: "website",
      locale: "de_DE",
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary",
      title: title.slice(0, 70),
      description: description.slice(0, 160),
    },
    robots: { index: true, follow: true },
  };
}

function VenueListJsonLd(input: { name: string; url: string; items: Array<{ name: string; url: string; position: number }> }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    url: input.url,
    numberOfItems: input.items.length,
    itemListElement: input.items.map((it) => ({
      "@type": "ListItem",
      position: it.position,
      item: {
        "@type": "Event",
        name: it.name,
        url: it.url,
      },
    })),
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export default async function VenuePage({ params }: Props) {
  const { slug } = await params;
  const data = await loadVenuePageData(slug);

  if (!data) {
    notFound();
  }

  const pageUrl = absoluteUrl(`/venues/${data.slug}`);
  const jsonItems = data.events.slice(0, 24).map((ev, i) => ({
    name: ev.title,
    url: absoluteUrl(`/event/${ev.id}`),
    position: i + 1,
  }));

  return (
    <AppShell theme="new" mainClassName="space-y-6 pb-16">
      <VenueListJsonLd name={`Events ${data.seoName}`} url={pageUrl} items={jsonItems} />

      <header className="space-y-3 border-b border-[#2B2623]/80 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A69A91]">Location · Tübingen</p>
        <h1 className="text-3xl font-black leading-tight text-[#F2ECE6] sm:text-4xl">{data.seoName}</h1>
        <p className="max-w-2xl text-base leading-relaxed text-[#c9bfb6]">{data.metaDescription}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/discover"
            className="inline-flex min-h-[40px] items-center rounded-full border border-[#2B2623] bg-[#1A1715]/90 px-4 py-2 text-sm font-semibold text-[#E9DFD6] transition-colors hover:border-[#3A312B]"
          >
            Alle Events in WasGehtTüb
          </Link>
        </div>
      </header>

      <section aria-labelledby="venue-events-heading">
        <h2 id="venue-events-heading" className="text-lg font-bold text-[#F2ECE6]">
          Kommende Termine ({data.events.length})
        </h2>

        {data.events.length === 0 ? (
          <p className="mt-4 rounded-xl border border-[#2B2623] bg-[#151210]/90 p-5 text-sm text-[#c9bfb6]">
            Aktuell sind keine zukünftigen Events für diese Location gemeldet. Schau später wieder rein oder stöbere in{" "}
            <Link href="/discover" className="font-semibold text-[#ff9a3f] underline-offset-2 hover:underline">
              Discover
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[#2B2623]/80 rounded-xl border border-[#2B2623] bg-[#151210]/92">
            {data.events.map((ev) => (
              <li key={ev.id}>
                <Link
                  href={`/event/${ev.id}`}
                  className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-[#1c1815]/95 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-[#F2ECE6]">{ev.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A69A91]">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {formatDateTime(ev.starts_at)}
                      </span>
                      {(ev.location_name ?? ev.vibe_label) ? (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{ev.location_name ?? ev.vibe_label}</span>
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-[#ff9a3f]">Details →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-[11px] text-[#6b615b]">
        Kuratierte Übersicht aus öffentlichen Event-Quellen ·{" "}
        <a href={`${SITE_URL}/discover`} className="underline-offset-2 hover:underline">
          {SITE_NAME}
        </a>
      </p>
    </AppShell>
  );
}
